import { recommendations } from '@server/audit/scoring'
import { formatChange, formatMetric, verdict, type ReportComparison } from '@shared/compare'
import { CRAWL_ISSUES } from '@shared/crawl-issues'
import { displayUrl, formatCount, formatNumber } from '@shared/format'
import { CATEGORY_BY_ID, PRIORITY_LABEL, STATUS_LABEL } from '@shared/grades'
import { describeSchedule, formatInZone, type Monitor } from '@shared/monitors'
import type {
	AuditReport,
	CheckResult,
	CrawlIssueId,
	CrawlReport,
	Detail,
	ReportSummary,
	SharePreviewResult
} from '@shared/types'

/**
 * Tool results as Markdown: short enough to fit a model's context, with the IDs and links it
 * needs for the next call.
 */

/** Rows and items shown per piece of evidence before saying how many more there are. */
const MAX_ROWS = 10

function more(count: number | undefined): string[] {
	return count ? [`  …and ${formatNumber(count)} more`] : []
}

/** A check's evidence as indented lines. Screenshots are left out; they're images. */
export function detailLines(detail: Detail): string[] {
	switch (detail.kind) {
		case 'list':
			return [
				...detail.items.slice(0, MAX_ROWS).map((item) => `  - ${item}`),
				...more((detail.more ?? 0) + Math.max(0, detail.items.length - MAX_ROWS))
			]
		case 'table':
			return [
				`  ${detail.columns.join(' | ')}`,
				...detail.rows.slice(0, MAX_ROWS).map((row) => `  ${row.join(' | ')}`),
				...more((detail.more ?? 0) + Math.max(0, detail.rows.length - MAX_ROWS))
			]
		case 'kv':
			return detail.items.map(([key, value]) => `  - ${key}: ${value}`)
		case 'code':
			return [`  ${detail.text}`]
		case 'serp':
			return [`  Google: ${detail.title} · ${detail.url} · ${detail.description}`]
		case 'social':
			return [
				`  Shared: ${detail.title} · ${detail.description}${detail.image ? ` · image ${detail.image}` : ''}`
			]
		case 'tags':
			return [`  ${detail.items.map((t) => t.label).join(', ')}`]
		case 'metrics':
			return detail.items.map((m) => `  - ${m.label}: ${m.value}`)
		case 'screenshots':
			return []
	}
}

export function checkBlock(check: CheckResult, withDetails = true): string[] {
	const priority =
		check.status === 'pass' || check.status === 'info'
			? ''
			: `, ${PRIORITY_LABEL[check.priority].toLowerCase()}`
	const lines = [
		`- **${check.title}** (\`${check.id}\`): ${STATUS_LABEL[check.status].toLowerCase()}${priority}. ${check.summary}`
	]
	if (check.recommendation) lines.push(`  Fix: ${check.recommendation}`)
	if (withDetails) lines.push(...(check.details ?? []).flatMap(detailLines))

	return lines
}

function categoryTable(report: AuditReport): string[] {
	return [
		'| Category | Grade | Score |',
		'| --- | --- | ---: |',
		...report.categories.map((c) => `| ${c.name} | ${c.grade} | ${c.score} |`)
	]
}

/** A new audit: the grade, each category and the most important fixes. */
export function auditSummary(report: AuditReport, link: string): string {
	const fixes = recommendations(report.checks)
	const shown = fixes.slice(0, 10)

	return [
		`# ${report.domain}: ${report.grade} (${report.score}/100)`,
		'',
		`${report.finalUrl} · report \`${report.id}\` · ${link}`,
		'',
		...categoryTable(report),
		'',
		fixes.length
			? `## Fix these first (${shown.length < fixes.length ? `top ${shown.length} of ${fixes.length}` : fixes.length})`
			: '## Nothing to fix: every check passed.',
		'',
		...shown.flatMap((check) => checkBlock(check, false)),
		'',
		`For the evidence behind each check, call get_report with id "${report.id}".`
	].join('\n')
}

/** A saved report's checks, by category. */
export function reportText(report: AuditReport, checks: CheckResult[], link: string): string {
	const sections = report.categories
		.map((category) => ({ category, own: checks.filter((c) => c.category === category.id) }))
		.filter((s) => s.own.length)
		.flatMap(({ category, own }) => [
			'',
			`## ${category.name}: ${category.grade} (${category.score})`,
			'',
			...own.flatMap((check) => checkBlock(check))
		])

	return [
		`# ${report.domain}: ${report.grade} (${report.score}/100)`,
		'',
		`${report.finalUrl} · audited ${report.createdAt} · ${link}`,
		...(sections.length ? sections : ['', 'No checks match.'])
	].join('\n')
}

export function reportList(reports: ReportSummary[], total: number): string {
	if (!reports.length) return 'No audits yet. Run one with audit_page.'

	return [
		`${formatCount(reports.length, 'audit')}${total > reports.length ? ` of ${total}` : ''}, newest first:`,
		'',
		'| Report ID | Page | Score | Audited |',
		'| --- | --- | ---: | --- |',
		...reports.map(
			(r) =>
				`| \`${r.id}\` | ${displayUrl(r.finalUrl)} | ${r.grade} ${r.score} | ${r.createdAt} |`
		)
	].join('\n')
}

export function comparisonText(comparison: ReportComparison, link: string): string {
	const { a, b } = comparison
	const changed = comparison.checks.filter(
		(c) => c.kind !== 'still-passing' && c.kind !== 'still-failing'
	)
	const side = (check?: { status: CheckResult['status']; summary: string }) =>
		check ? `${STATUS_LABEL[check.status].toLowerCase()}: ${check.summary}` : 'not checked'

	return [
		`# ${a.label} → ${b.label}`,
		'',
		verdict(comparison),
		'',
		`A: ${a.finalUrl} (\`${a.id}\`, ${a.createdAt})  `,
		`B: ${b.finalUrl} (\`${b.id}\`, ${b.createdAt})  `,
		`Side by side: ${link}`,
		'',
		`| Category | ${a.label} | ${b.label} | Change |`,
		'| --- | ---: | ---: | ---: |',
		...comparison.categories.map(
			(c) =>
				`| ${c.name} | ${c.a.grade} ${c.a.score} | ${c.b.grade} ${c.b.score} | ${formatChange(c.change)} |`
		),
		'',
		`| Metric | ${a.label} | ${b.label} |`,
		'| --- | ---: | ---: |',
		...comparison.metrics.map(
			(m) => `| ${m.label} | ${formatMetric(m.unit, m.a)} | ${formatMetric(m.unit, m.b)} |`
		),
		'',
		changed.length
			? `## ${formatCount(changed.length, 'check')} changed`
			: '## No check changed',
		'',
		...changed.map(
			(c) =>
				`- **${c.title}** (\`${c.id}\`, ${CATEGORY_BY_ID[c.category].name}), ${c.kind.replace('-', ' ')}. ${a.label}: ${side(c.a)} ${b.label}: ${side(c.b)}`
		)
	].join('\n')
}

export function crawlSummary(crawl: CrawlReport, link: string): string {
	return [
		`# Crawl of ${crawl.domain}: ${crawl.health}% healthy`,
		'',
		`${formatCount(crawl.pages.length, 'page')} from ${crawl.startUrl}${crawl.limitReached ? `, stopped at the ${crawl.maxPages}-page limit` : ''} · crawl \`${crawl.id}\` · ${link}`,
		'',
		crawl.issues.length ? '## Issues' : 'No issues found.',
		'',
		...crawl.issues.flatMap((issue) => {
			const examples = crawl.pages.filter((p) => p.issues.includes(issue.id)).slice(0, 3)

			return [
				`- **${issue.title}** (\`${issue.id}\`, ${PRIORITY_LABEL[issue.priority].toLowerCase()}): ${formatCount(issue.count, 'page')}. ${CRAWL_ISSUES[issue.id].fix}`,
				...examples.map((p) => `  - ${p.url}`)
			]
		}),
		'',
		`For every page with one issue, call get_crawl with id "${crawl.id}" and that issue.`
	].join('\n')
}

export function crawlPages(crawl: CrawlReport, issue: CrawlIssueId): string {
	const pages = crawl.pages.filter((p) => p.issues.includes(issue))
	const shown = pages.slice(0, 50)

	return [
		`# ${CRAWL_ISSUES[issue].title} on ${crawl.domain}: ${formatCount(pages.length, 'page')}`,
		'',
		CRAWL_ISSUES[issue].fix,
		'',
		'| Page | Status | Title |',
		'| --- | --- | --- |',
		...shown.map((p) => `| ${p.url} | ${p.status ?? p.error ?? '–'} | ${p.title ?? ''} |`),
		...(pages.length > shown.length ? ['', `…and ${pages.length - shown.length} more.`] : [])
	].join('\n')
}

export function previewText(result: SharePreviewResult): string {
	const { sharing } = result
	const image = sharing.ogImage
	const imageLine = image
		? `Share image: ${image.url} (${image.ok ? `${image.width ?? '?'}×${image.height ?? '?'}, ${image.format ?? 'image'}` : `doesn't load: ${image.error ?? image.status}`})`
		: 'Share image: none (no og:image)'

	return [
		`# How ${displayUrl(result.finalUrl)} looks when shared`,
		'',
		imageLine,
		`Icons: ${sharing.icons.length ? sharing.icons.map((i) => `${i.kind} ${i.width ?? '?'}×${i.height ?? '?'}${i.ok ? '' : ' (broken)'}`).join(', ') : 'none'}`,
		'',
		...sharing.previews.flatMap((preview) => [
			`## ${preview.name}`,
			`${preview.title}${preview.description ? ` · ${preview.description}` : ''} · ${preview.displayUrl} · ${preview.layout === 'none' ? 'no image' : `${preview.layout} image`}`,
			...preview.notes.map((n) => `- ${STATUS_LABEL[n.tone].toLowerCase()}: ${n.text}`),
			''
		])
	].join('\n')
}

export function monitorList(monitors: Monitor[], link: string): string {
	if (!monitors.length) return `No monitors yet. Add one with add_monitor, or at ${link}.`

	return [
		`${formatCount(monitors.length, 'monitor')} (${link}):`,
		'',
		...monitors.map((m) => {
			const [last] = m.runs
			const result = !last
				? 'not run yet'
				: last.ok
					? `last run ${last.at}: ${last.grade} ${last.score}`
					: `last run ${last.at}: didn't load (${last.error})`
			const next = m.paused
				? 'paused'
				: `next run ${formatInZone(m.nextRunAt, m.schedule.timeZone)} (${m.schedule.timeZone})`

			return `- ${m.url} (\`${m.id}\`): ${describeSchedule(m.schedule)}, ${next}; ${result}`
		})
	].join('\n')
}
