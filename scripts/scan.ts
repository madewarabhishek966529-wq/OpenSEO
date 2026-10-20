/**
 * `pnpm scan <url>`: audits a page from the terminal and prints the grades and what to fix.
 *
 * Usage:
 *   pnpm scan example.com            the summary
 *   pnpm scan example.com --json     the full report as JSON
 *   pnpm scan example.com --all      every check, not only the ones to fix
 *
 * Set PAGESPEED_API_KEY to include Core Web Vitals from Google PageSpeed Insights.
 */
import pc from 'picocolors'
import { AuditError, runAudit } from '@server/audit'
import { recommendations } from '@server/audit/scoring'
import { toneFor } from '@shared/grades'
import type { AuditReport, Status } from '@shared/types'

const TONE: Record<Status, (text: string) => string> = {
	pass: pc.green,
	warn: pc.yellow,
	fail: pc.red,
	info: pc.dim
}

const MARK: Record<Status, string> = { pass: '✔', warn: '▲', fail: '✖', info: '·' }

function printReport(report: AuditReport, all: boolean): void {
	const tone = TONE[toneFor(report.score)]
	console.log('')
	console.log(
		`${pc.bold(report.finalUrl)}  ${pc.dim(`${(report.durationMs / 1000).toFixed(1)} s`)}`
	)
	console.log(`${tone(pc.bold(`${report.grade}  ${report.score}/100`))}`)
	console.log('')
	for (const category of report.categories) {
		const name = category.name.padEnd(14)
		const bar = '█'.repeat(Math.round(category.score / 5)).padEnd(20, '░')
		console.log(
			`  ${name} ${TONE[toneFor(category.score)](bar)} ${category.grade.padEnd(3)} ${pc.dim(String(category.score))}`
		)
	}
	console.log('')
	const list = all ? report.checks : recommendations(report.checks)
	console.log(pc.bold(all ? 'Every check' : `${list.length} things to fix`))
	for (const check of list) {
		console.log(
			`  ${TONE[check.status](MARK[check.status])} ${check.title}${pc.dim(` · ${check.summary}`)}`
		)
	}
	console.log('')
}

async function main(): Promise<void> {
	const args = process.argv.slice(2)
	const url = args.find((a) => !a.startsWith('--'))
	if (!url) {
		console.error('Usage: pnpm scan <url> [--json] [--all]')
		process.exitCode = 1

		return
	}
	const json = args.includes('--json')
	const apiKey = process.env.PAGESPEED_API_KEY
	try {
		const report = await runAudit(url, {
			source: 'cli',
			pagespeed: { enabled: Boolean(apiKey), apiKey },
			onProgress: (p) => {
				if (!json)
					process.stderr.write(pc.dim(`  ${String(p.pct).padStart(3)}%  ${p.label}\n`))
			}
		})
		if (json) console.log(JSON.stringify(report, null, '\t'))
		else printReport(report, args.includes('--all'))
	} catch (e) {
		console.error(pc.red(e instanceof AuditError ? e.message : String(e)))
		process.exitCode = 1
	}
}

main()
