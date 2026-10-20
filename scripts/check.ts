/**
 * `pnpm check <url>`: audits a page, compares it with a baseline, and fails when it got worse.
 * It's what the OpenSEO GitHub Action runs, and works in any CI.
 *
 * Usage:
 *   pnpm check preview.example.com --baseline example.com
 *   pnpm check preview.example.com --baseline example.com --paths /,/pricing
 *   pnpm check example.com --min-score 80
 *
 * `pnpm check --help` lists every option.
 *
 * The GitHub Action passes the same settings as INPUT_* variables. Inside GitHub Actions it also
 * writes the job summary and step outputs, and comments on the pull request when it has a token.
 * Exits with 1 when the check fails and 2 when the options are wrong.
 */
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pc from 'picocolors'
import { AuditError } from '@server/audit'
import type { FailOn } from '@server/ci/gate'
import {
	annotation,
	pullRequestNumber,
	setOutputs,
	upsertComment,
	writeSummary
} from '@server/ci/github'
import { commentMarker, toMarkdown } from '@server/ci/markdown'
import { runCheck, type CheckOptions, type CheckResults } from '@server/ci/run'
import { formatChange } from '@shared/compare'

const USAGE = `Usage: pnpm check <url> [options]

  --baseline <url>         the page to compare with, usually production
  --paths <list>           paths to audit on both sites, separated by commas
  --max-drop <points>      the most the score may drop below the baseline (default 2)
  --min-score <score>      the lowest score a page may have (default 0)
  --fail-on <level>        fail, warn or none: which new problems fail (default fail)
  --ignore <ids>           check IDs to leave out, separated by commas
  --preview <mode>         auto, on or off: forgive what preview hosts change (default auto)
  --header "Name: value"   a header for requests to the audited site; repeat for more
  --json <file>            write the results as JSON
  --markdown <file>        write the summary as Markdown`

class UsageError extends Error {}

/** Flags given more than once keep every value; the rest keep the last. */
function parseArgs(args: string[]): { positional: string[]; flags: Map<string, string[]> } {
	const positional: string[] = []
	const flags = new Map<string, string[]>()
	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (!arg.startsWith('--')) {
			positional.push(arg)
			continue
		}
		const [name, inline] = arg.slice(2).split(/=(.*)/s)
		const value = inline ?? args[++i]
		if (value === undefined) throw new UsageError(`--${name} needs a value.`)
		flags.set(name, [...(flags.get(name) ?? []), value])
	}

	return { positional, flags }
}

function list(value: string | undefined): string[] {
	return (value ?? '')
		.split(/[\n,]/)
		.map((item) => item.trim())
		.filter(Boolean)
}

function number(value: string | undefined, name: string, fallback: number): number {
	if (value === undefined || value.trim() === '') return fallback
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed < 0)
		throw new UsageError(`${name} must be a number of 0 or more.`)

	return parsed
}

function oneOf<T extends string>(
	value: string | undefined,
	name: string,
	options: T[],
	fallback: T
): T {
	if (!value?.trim()) return fallback
	const picked = value.trim().toLowerCase() as T
	if (!options.includes(picked)) {
		const choices = `${options.slice(0, -1).join(', ')} or ${options.at(-1)}`
		throw new UsageError(`${name} must be ${choices}.`)
	}

	return picked
}

/** One item per line, like the action's headers input, whose values may hold commas. */
function lines(value: string | undefined): string[] {
	return (value ?? '')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
}

/** "Name: value" lines into headers. */
function headers(lines: string[]): Record<string, string> | undefined {
	if (!lines.length) return undefined

	return Object.fromEntries(
		lines.map((line) => {
			const at = line.indexOf(':')
			if (at < 1) throw new UsageError(`Headers look like "Name: value", not "${line}".`)

			return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
		})
	)
}

/** The options from flags, falling back to the INPUT_* variables the GitHub Action sets. */
function readOptions(args: string[]) {
	const { positional, flags } = parseArgs(args)
	const env = process.env
	const flag = (name: string) => flags.get(name)?.at(-1)
	const url = positional[0] ?? env.INPUT_URL
	if (!url?.trim()) throw new UsageError('Give the URL to audit.')
	const preview = oneOf(
		flag('preview') ?? env.INPUT_PREVIEW,
		'preview',
		['auto', 'on', 'off', 'true', 'false'],
		'auto'
	)

	const options: CheckOptions = {
		url,
		baseline: (flag('baseline') ?? env.INPUT_BASELINE_URL)?.trim() || undefined,
		paths: list(flag('paths') ?? env.INPUT_PATHS),
		maxDrop: number(flag('max-drop') ?? env.INPUT_MAX_SCORE_DROP, 'max-drop', 2),
		minScore: number(flag('min-score') ?? env.INPUT_MIN_SCORE, 'min-score', 0),
		failOn: oneOf<FailOn>(
			flag('fail-on') ?? env.INPUT_FAIL_ON,
			'fail-on',
			['fail', 'warn', 'none'],
			'fail'
		),
		ignore: list(flag('ignore') ?? env.INPUT_IGNORE_CHECKS),
		preview: preview === 'true' ? 'on' : preview === 'false' ? 'off' : preview,
		headers: headers(flags.get('header') ?? lines(env.INPUT_HEADERS)),
		pagespeedKey: env.PAGESPEED_API_KEY || undefined,
		log: (line) => console.log(pc.dim(line))
	}

	return {
		options,
		json: flag('json'),
		markdown: flag('markdown'),
		comment: (flag('comment') ?? env.INPUT_COMMENT ?? 'true') !== 'false',
		token: env.INPUT_GITHUB_TOKEN || env.GITHUB_TOKEN
	}
}

function printResults(results: CheckResults): void {
	console.log('')
	console.log(
		results.passed
			? pc.green(pc.bold('✔ OpenSEO check passed'))
			: pc.red(pc.bold('✖ OpenSEO check failed'))
	)
	for (const page of results.pages) {
		const now = page.report ? `${page.report.score} ${page.report.grade}` : "didn't load"
		const before = page.baselineReport
			? `${page.baselineReport.score} ${page.baselineReport.grade} → `
			: ''
		const change =
			page.report && page.baselineReport
				? `  ${formatChange(page.report.score - page.baselineReport.score)}`
				: ''
		console.log(`  ${page.label.padEnd(24)} ${before}${now}${change}`)
	}
	for (const failure of results.failures) console.log(pc.red(`  ✖ ${failure}`))
	for (const warning of results.warnings) console.log(pc.yellow(`  ▲ ${warning}`))
	console.log('')
}

/** Job summary, outputs, annotations and the pull request comment. */
async function reportToGitHub(
	results: CheckResults,
	markdown: string,
	resultsFile: string,
	comment: boolean,
	token?: string
) {
	const [first] = results.pages
	const count = (pick: (page: CheckResults['pages'][number]) => unknown[]) =>
		results.pages.reduce((sum, page) => sum + pick(page).length, 0)
	await writeSummary(markdown)
	await setOutputs({
		passed: results.passed,
		score: first?.report?.score ?? '',
		grade: first?.report?.grade ?? '',
		'baseline-score': first?.baselineReport?.score ?? '',
		'score-change':
			first?.report && first.baselineReport
				? first.report.score - first.baselineReport.score
				: '',
		'new-problems': count((page) => page.newProblems),
		fixed: count((page) => page.fixed),
		results: resultsFile
	})
	for (const failure of results.failures) console.log(annotation('error', failure))
	for (const warning of results.warnings) console.log(annotation('warning', warning))
	if (!comment || !token) return
	try {
		const number = await pullRequestNumber(token)
		if (!number) return
		const key = new URL(results.options.baseline ?? results.options.url).host
		const url = await upsertComment(token, number, commentMarker(key), markdown)
		console.log(`Commented on the pull request: ${url}`)
	} catch (e) {
		console.log(
			annotation('warning', `Couldn't comment on the pull request: ${(e as Error).message}`)
		)
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2)
	if (args.includes('--help') || args.includes('-h')) {
		console.log(USAGE)

		return
	}
	let settings: ReturnType<typeof readOptions>
	try {
		settings = readOptions(args)
	} catch (e) {
		if (!(e instanceof UsageError)) throw e
		console.error(pc.red(e.message))
		console.error(USAGE)
		process.exitCode = 2

		return
	}
	const { options, json, markdown: markdownFile, comment, token } = settings
	if (process.env.GITHUB_ACTIONS === 'true') {
		// Header values (like a bypass token) and the PageSpeed key never show in the log.
		const secrets = [...Object.values(options.headers ?? {}), options.pagespeedKey ?? '']
		for (const secret of secrets.filter(Boolean)) console.log(`::add-mask::${secret}`)
	}
	let results: CheckResults
	try {
		results = await runCheck(options)
	} catch (e) {
		console.error(pc.red(e instanceof AuditError ? e.message : String(e)))
		process.exitCode = 2

		return
	}
	printResults(results)
	const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string
	const markdown = toMarkdown(results, version)
	const inGitHub = process.env.GITHUB_ACTIONS === 'true'
	const resultsFile =
		json ?? (inGitHub ? join(process.env.RUNNER_TEMP || tmpdir(), 'openseo-results.json') : '')
	if (resultsFile) await writeFile(resultsFile, JSON.stringify(results, null, '\t'))
	if (markdownFile) await writeFile(markdownFile, markdown)
	if (inGitHub) await reportToGitHub(results, markdown, resultsFile, comment, token)
	if (!results.passed) process.exitCode = 1
}

main()
