import { formatBytes, formatCount, formatList, formatMs, formatNumber } from './format'
import { CATEGORIES, PRIORITY_RANK } from './grades'
import type { AuditOverview, AuditReport, CategoryId, CheckResult, Priority, Status } from './types'

/** How much attention a result needs. Info checks count as fine. */
export const SEVERITY: Record<Status, number> = { pass: 0, info: 0, warn: 1, fail: 2 }

/**
 * How one check moved from A to B. "new-problem" passed in A and needs work in B, "worse" went
 * from needing work to failing, "fixed" needs work in A and passes in B, "improved" went from
 * failing to needing work. "added" and "removed" checks only exist in one of the reports, which
 * happens when OpenSEO adds or drops a check between versions.
 */
export type ChangeKind =
	| 'new-problem'
	| 'worse'
	| 'fixed'
	| 'improved'
	| 'still-failing'
	| 'still-passing'
	| 'added'
	| 'removed'

export interface CheckSide {
	status: Status
	summary: string
}

export interface CheckComparison {
	id: string
	title: string
	category: CategoryId
	priority: Priority
	weight: number
	a?: CheckSide
	b?: CheckSide
	kind: ChangeKind
	/** How to fix it in B, or in A when only A has the problem. */
	recommendation?: string
}

export interface ComparedReport {
	id: string
	url: string
	finalUrl: string
	domain: string
	title: string
	createdAt: string
	score: number
	grade: string
	/** A short name for this side: "Before" and "After", or the site. */
	label: string
}

export interface CategoryComparison {
	id: CategoryId
	name: string
	a: { score: number; grade: string }
	b: { score: number; grade: string }
	change: number
}

export type MetricId = keyof Pick<
	AuditOverview,
	'responseTimeMs' | 'loadTimeMs' | 'pageSizeBytes' | 'requests' | 'wordCount'
>

export interface MetricComparison {
	id: MetricId
	label: string
	a: number
	b: number
	unit: 'ms' | 'bytes' | 'count'
	/** Which way is good: less time and weight, or neither for word counts. */
	better: 'lower' | 'higher' | null
}

export interface ReportComparison {
	a: ComparedReport
	b: ComparedReport
	/** The same page audited twice. A is then always the earlier audit. */
	samePage: boolean
	/** B's score minus A's. */
	scoreChange: number
	categories: CategoryComparison[]
	metrics: MetricComparison[]
	/** Every check, most important first within each kind of change. */
	checks: CheckComparison[]
}

const METRICS: Omit<MetricComparison, 'a' | 'b'>[] = [
	{ id: 'responseTimeMs', label: 'Server response', unit: 'ms', better: 'lower' },
	{ id: 'loadTimeMs', label: 'Download time', unit: 'ms', better: 'lower' },
	{ id: 'pageSizeBytes', label: 'Page size', unit: 'bytes', better: 'lower' },
	{ id: 'requests', label: 'Requests', unit: 'count', better: 'lower' },
	{ id: 'wordCount', label: 'Words', unit: 'count', better: null }
]

const CATEGORY_ORDER = CATEGORIES.map((c) => c.id)

/** The page a URL points at, ignoring the scheme, www, a trailing slash and the fragment. */
export function pageKey(url: string): string {
	try {
		const u = new URL(url)
		const host = u.host.replace(/^www\./i, '').toLowerCase()

		return `${host}${u.pathname.replace(/\/$/, '')}${u.search}`
	} catch {
		return url
	}
}

export function kindOf(a: CheckSide | undefined, b: CheckSide | undefined): ChangeKind {
	if (!a) return 'added'
	if (!b) return 'removed'
	const before = SEVERITY[a.status]
	const after = SEVERITY[b.status]
	if (after > before) return before === 0 ? 'new-problem' : 'worse'
	if (after < before) return after === 0 ? 'fixed' : 'improved'

	return after === 0 ? 'still-passing' : 'still-failing'
}

function compareCheck(a: CheckResult | undefined, b: CheckResult | undefined): CheckComparison {
	const base = (b ?? a) as CheckResult
	const side = (check?: CheckResult): CheckSide | undefined =>
		check && { status: check.status, summary: check.summary }

	return {
		id: base.id,
		title: base.title,
		category: base.category,
		priority: base.priority,
		weight: Math.max(a?.weight ?? 0, b?.weight ?? 0),
		a: side(a),
		b: side(b),
		kind: kindOf(side(a), side(b)),
		recommendation: b?.recommendation ?? a?.recommendation
	}
}

/** Most urgent first: priority, then how much the check weighs, then category order. */
function byImportance(x: CheckComparison, y: CheckComparison): number {
	return (
		PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] ||
		y.weight - x.weight ||
		CATEGORY_ORDER.indexOf(x.category) - CATEGORY_ORDER.indexOf(y.category)
	)
}

function describe(report: AuditReport, label: string): ComparedReport {
	return {
		id: report.id,
		url: report.url,
		finalUrl: report.finalUrl,
		domain: report.domain,
		title: report.overview.title,
		createdAt: report.createdAt,
		score: report.score,
		grade: report.grade,
		label
	}
}

/** The URL without the protocol or a trailing slash, for labels. */
function shortUrl(url: string): string {
	return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/**
 * Compares two audits check by check. Two audits of the same page are put in time order, so A
 * is "before" and B "after", unless `inTimeOrder` is false; two different pages keep the order
 * given (yours, then theirs).
 */
export function compareReports(
	first: AuditReport,
	second: AuditReport,
	options: { inTimeOrder?: boolean } = {}
): ReportComparison {
	const { inTimeOrder = true } = options
	const samePage = pageKey(first.finalUrl) === pageKey(second.finalUrl)
	const [a, b] =
		samePage && inTimeOrder && first.createdAt > second.createdAt
			? [second, first]
			: [first, second]
	const labels = samePage
		? ['Before', 'After']
		: a.domain === b.domain
			? [shortUrl(a.finalUrl), shortUrl(b.finalUrl)]
			: [a.domain, b.domain]

	const ids = [...new Set([...a.checks.map((c) => c.id), ...b.checks.map((c) => c.id)])]
	const checks = ids
		.map((id) =>
			compareCheck(
				a.checks.find((c) => c.id === id),
				b.checks.find((c) => c.id === id)
			)
		)
		.sort(byImportance)

	return {
		a: describe(a, labels[0]),
		b: describe(b, labels[1]),
		samePage,
		scoreChange: b.score - a.score,
		categories: CATEGORIES.map((category) => {
			const before = a.categories.find((c) => c.id === category.id)
			const after = b.categories.find((c) => c.id === category.id)
			const scoreA = before?.score ?? 0
			const scoreB = after?.score ?? 0

			return {
				id: category.id,
				name: category.name,
				a: { score: scoreA, grade: before?.grade ?? '–' },
				b: { score: scoreB, grade: after?.grade ?? '–' },
				change: scoreB - scoreA
			}
		}),
		metrics: METRICS.map((metric) => ({
			...metric,
			a: a.overview[metric.id],
			b: b.overview[metric.id]
		})),
		checks
	}
}

/** The checks of one kind of change, in the comparison's order. */
export function checksOfKind(comparison: ReportComparison, kind: ChangeKind): CheckComparison[] {
	return comparison.checks.filter((c) => c.kind === kind)
}

export function changeCounts(comparison: ReportComparison): Record<ChangeKind, number> {
	const counts: Record<ChangeKind, number> = {
		'new-problem': 0,
		worse: 0,
		fixed: 0,
		improved: 0,
		'still-failing': 0,
		'still-passing': 0,
		added: 0,
		removed: 0
	}
	comparison.checks.forEach((c) => counts[c.kind]++)

	return counts
}

/**
 * One sentence on how B compares with A: "The score went up 6 points, from 76 (B) to 82 (B+):
 * 3 checks fixed and 1 new problem." For two different pages it says which is ahead.
 */
export function verdict(comparison: ReportComparison): string {
	const { a, b, samePage, scoreChange } = comparison
	const counts = changeCounts(comparison)
	const points = formatCount(Math.abs(scoreChange), 'point')
	if (samePage) {
		const score = scoreChange
			? `The score ${scoreChange > 0 ? 'went up' : 'dropped'} ${points}, from ${a.score} (${a.grade}) to ${b.score} (${b.grade})`
			: `The score stayed at ${b.score} (${b.grade})`
		const changes = [
			counts.fixed && `${formatCount(counts.fixed, 'check')} fixed`,
			counts.improved && `${formatCount(counts.improved, 'check')} improved`,
			counts['new-problem'] && formatCount(counts['new-problem'], 'new problem'),
			counts.worse && `${formatCount(counts.worse, 'check')} got worse`
		].filter((part): part is string => Boolean(part))

		return changes.length
			? `${score}: ${formatList(changes)}.`
			: `${score}, and no check changed.`
	}
	const lead = scoreChange
		? `${b.label} scores ${points} ${scoreChange > 0 ? 'higher' : 'lower'} than ${a.label} (${b.score} against ${a.score})`
		: `${a.label} and ${b.label} both score ${b.score}`
	const aBehind = counts.fixed + counts.improved
	const bBehind = counts['new-problem'] + counts.worse

	return `${lead}. ${a.label} is behind on ${formatCount(aBehind, 'check')}, ${b.label} on ${formatNumber(bBehind)}.`
}

/** A metric value the way the report shows it: "320 ms", "1.2 MB", "48". */
export function formatMetric(unit: MetricComparison['unit'], value: number): string {
	if (unit === 'ms') return formatMs(value)
	if (unit === 'bytes') return formatBytes(value)

	return formatNumber(value)
}

/** Whether B's value is an improvement on A's (1), a step back (-1) or neither (0). */
export function metricTrend(metric: MetricComparison): -1 | 0 | 1 {
	if (!metric.better || metric.a === metric.b) return 0
	const lowerWins = metric.better === 'lower'

	return metric.b < metric.a === lowerWins ? 1 : -1
}

/** "+6", "−4" or "±0", with a real minus sign. */
export function formatChange(change: number): string {
	if (change > 0) return `+${change}`
	if (change < 0) return `−${Math.abs(change)}`

	return '±0'
}
