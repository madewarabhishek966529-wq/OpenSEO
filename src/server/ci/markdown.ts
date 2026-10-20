import { formatChange, type CheckComparison } from '@shared/compare'
import { formatCount } from '@shared/format'
import { CATEGORY_BY_ID } from '@shared/grades'
import type { AuditReport, Status } from '@shared/types'
import type { PageVerdict } from './gate'
import type { CheckResults } from './run'

const MARKS: Record<Status, string> = { pass: '✔', warn: '▲', fail: '✖', info: '·' }

/** GitHub caps comments at 65,536 characters. */
const MAX_LENGTH = 60_000

/** Marks OpenSEO's comment on a pull request, so the next run updates it instead of adding one. */
export function commentMarker(key: string): string {
	return `<!-- openseo-check ${key} -->`
}

/** Text that can sit in a Markdown table cell without turning into HTML or breaking the row. */
function escape(text: string): string {
	return text
		.replace(/\\/g, '\\\\')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\|/g, '\\|')
		.replace(/\s+/g, ' ')
}

/** A path or address as code, unless it holds a backtick or a pipe, which a code span in a table can't show. */
function code(text: string): string {
	return /[`|]/.test(text) ? escape(text) : `\`${text}\``
}

function scoreCell(report?: AuditReport, error?: string): string {
	if (error) return "✖ didn't load"

	return report ? `${report.score} ${report.grade}` : '–'
}

function changeCell(page: PageVerdict): string {
	if (!page.report || !page.baselineReport) return '–'

	return formatChange(page.report.score - page.baselineReport.score)
}

function problemLine(check: CheckComparison): string {
	const status = check.b?.status ?? 'fail'
	const where = CATEGORY_BY_ID[check.category].name

	return `- ${MARKS[status]} **${escape(check.title)}** (${where}): ${escape(check.b?.summary ?? '')}`
}

/** Every check that changed on one page, folded away under a summary line. */
function changeTable(page: PageVerdict, labels: [string, string]): string[] {
	const changed =
		page.comparison?.checks.filter(
			(c) => c.kind !== 'still-passing' && c.kind !== 'still-failing'
		) ?? []
	if (!changed.length) return []
	const side = (check?: CheckComparison['a']) =>
		check ? `${MARKS[check.status]} ${escape(check.summary)}` : 'Not checked'

	return [
		'',
		`<details><summary>Every change on ${escape(page.label)} (${changed.length})</summary>`,
		'',
		`| Check | ${labels[0]} | ${labels[1]} |`,
		'| :-- | :-- | :-- |',
		...changed.map((c) => `| ${escape(c.title)} | ${side(c.a)} | ${side(c.b)} |`),
		'',
		'</details>'
	]
}

/** The results as Markdown, for the job summary and the pull request comment. */
export function toMarkdown(results: CheckResults, version: string): string {
	const { passed, pages, failures, warnings, options } = results
	const labels: [string, string] = options.preview
		? ['Production', 'Preview']
		: ['Baseline', 'This version']
	const intro = options.baseline
		? `Compared ${options.preview ? 'the preview with production' : 'it with the baseline'} on ${formatCount(pages.length, 'page')}.`
		: `Audited ${formatCount(pages.length, 'page')}.`
	const lines = [
		`### ${passed ? '✔ OpenSEO check passed' : '✖ OpenSEO check failed'}`,
		'',
		intro,
		''
	]

	if (options.baseline) {
		lines.push(
			`| | Page | ${labels[0]} | ${labels[1]} | Change |`,
			'| :-: | :-- | --: | --: | --: |'
		)
		for (const page of pages) {
			lines.push(
				`| ${page.failures.length ? '✖' : '✔'} | ${code(page.label)} | ${scoreCell(page.baselineReport, page.baselineError)} | ${scoreCell(page.report, page.error)} | ${changeCell(page)} |`
			)
		}
	} else {
		lines.push('| | Page | Score |', '| :-: | :-- | --: |')
		for (const page of pages) {
			lines.push(
				`| ${page.failures.length ? '✖' : '✔'} | ${code(page.label)} | ${scoreCell(page.report, page.error)} |`
			)
		}
	}

	if (failures.length)
		lines.push('', '**Why it failed**', '', ...failures.map((f) => `- ${escape(f)}`))
	for (const page of pages) {
		if (page.newProblems.length) {
			lines.push(
				'',
				`**New problems on ${code(page.label)}**`,
				'',
				...page.newProblems.map(problemLine)
			)
		}
		if (page.fixed.length) {
			lines.push('', `**Fixed on ${code(page.label)}**`, '', ...page.fixed.map(problemLine))
		}
		lines.push(...changeTable(page, labels))
	}
	if (warnings.length) lines.push('', ...warnings.map((w) => `> ▲ ${escape(w)}`))

	const notes = [
		options.preview &&
			'The audited URL is a preview, so the X-Robots-Tag noindex header preview hosts add, canonical tags and email records were left out.',
		options.ignore.length > 0 && `Also left out: ${options.ignore.map(code).join(', ')}.`,
		'Timings (server response, download time and Core Web Vitals) vary between runs, so the check leaves them out.'
	].filter(Boolean)
	lines.push(
		'',
		`<sub>${notes.join(' ')} Checked with [OpenSEO](https://github.com/alexsilver8/open-seo) ${version}.</sub>`
	)
	const markdown = lines.join('\n')

	return markdown.length > MAX_LENGTH
		? `${markdown.slice(0, MAX_LENGTH)}\n\n… cut short. The full results are in the job's output.`
		: markdown
}
