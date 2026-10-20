import { overallScore, scoreCategories } from '@server/audit/scoring'
import { compareReports, type CheckComparison, type ReportComparison } from '@shared/compare'
import { formatCount, formatList } from '@shared/format'
import { gradeFor } from '@shared/grades'
import type { AuditReport, CheckResult } from '@shared/types'

/** Which new problems fail the check: checks that start failing, also those that start needing work, or none. */
export type FailOn = 'fail' | 'warn' | 'none'

export interface GateOptions {
	/** The most points the score may drop below the baseline. */
	maxDrop: number
	/** The lowest score any page may have. */
	minScore: number
	failOn: FailOn
	/** Check IDs to leave out of scores and comparisons. */
	ignore: string[]
	/** The audited URL is a preview deploy: forgive what preview hosts change. */
	preview: boolean
}

/**
 * Checks that depend on the domain rather than the code, so a preview deploy gets them wrong on
 * purpose: its canonical tags point at production, and its domain has no email records.
 */
export const PREVIEW_CHECKS = ['canonical', 'email-auth']

/**
 * Checks that measure time: the server's response, the download and Core Web Vitals. A cold
 * start or a busy runner moves them from run to run, so the check leaves them out entirely.
 */
export const TIMING_CHECKS = ['response-time', 'load-time', 'web-vitals']

/** One page audited on both sites, before judging. */
export interface PageAudit {
	/** How the page is named in summaries: its path, or its address. */
	label: string
	url: string
	baselineUrl?: string
	report?: AuditReport
	error?: string
	baselineReport?: AuditReport
	baselineError?: string
}

export interface PageVerdict extends Omit<PageAudit, 'report' | 'baselineReport'> {
	/** The audit as scored for the check, without ignored checks. */
	report?: AuditReport
	baselineReport?: AuditReport
	comparison?: ReportComparison
	/** Checks that got worse in a way that fails the check. */
	newProblems: CheckComparison[]
	fixed: CheckComparison[]
	/** Why this page fails the check. Empty when it passes. */
	failures: string[]
}

/**
 * Preview hosts (Vercel, Netlify, Cloudflare Pages) send `X-Robots-Tag: noindex` so previews stay
 * out of search. That's no fault of the code; a noindex in the page itself still is.
 */
export function noindexOnlyFromHeader(check: CheckResult): boolean {
	if (check.id !== 'indexable' || check.status !== 'fail') return false
	// The indexable check lists where it found noindex, as "Meta robots: …" and "X-Robots-Tag: …".
	const sources = check.details?.flatMap((d) => (d.kind === 'list' ? d.items : [])) ?? []
	const says = (prefix: string) =>
		sources.some((item) => item.startsWith(prefix) && /noindex|none/i.test(item))

	return says('X-Robots-Tag:') && !says('Meta robots:')
}

/**
 * The report as the check sees it: without timings and ignored checks, and on a preview, with the
 * noindex header preview hosts add forgiven. Scored again, so both sides are scored on the same
 * checks.
 */
export function prepareReport(
	report: AuditReport,
	options: Pick<GateOptions, 'ignore' | 'preview'>,
	side: 'baseline' | 'candidate'
): AuditReport {
	const left = report.checks.filter(
		(c) =>
			!TIMING_CHECKS.includes(c.id) &&
			!options.ignore.includes(c.id) &&
			!(options.preview && PREVIEW_CHECKS.includes(c.id))
	)
	const checks = left.map((c) =>
		options.preview && side === 'candidate' && noindexOnlyFromHeader(c)
			? {
					...c,
					status: 'pass' as const,
					summary: 'Only the X-Robots-Tag header says noindex, which preview hosts add.',
					recommendation: undefined
				}
			: c
	)
	const categories = scoreCategories(checks)
	const score = overallScore(categories)

	return { ...report, checks, categories, score, grade: gradeFor(score) }
}

/** The worsened checks that fail the check, by the fail-on setting. */
export function gatingProblems(comparison: ReportComparison, failOn: FailOn): CheckComparison[] {
	if (failOn === 'none') return []

	return comparison.checks.filter((c) => {
		if (failOn === 'warn') return c.kind === 'new-problem' || c.kind === 'worse'

		return c.b?.status === 'fail' && c.a?.status !== 'fail' && c.kind !== 'added'
	})
}

/** Decides whether one page passes: it loaded, scores high enough, and didn't get worse. */
export function judgePage(audit: PageAudit, options: GateOptions): PageVerdict {
	const { label } = audit
	const report = audit.report && prepareReport(audit.report, options, 'candidate')
	const baselineReport =
		audit.baselineReport && prepareReport(audit.baselineReport, options, 'baseline')
	// The baseline is always A, even when both audits are of the same page.
	const comparison =
		report && baselineReport
			? compareReports(baselineReport, report, { inTimeOrder: false })
			: undefined
	const newProblems = comparison ? gatingProblems(comparison, options.failOn) : []
	const fixed = comparison?.checks.filter((c) => c.kind === 'fixed') ?? []
	const failures: string[] = []

	if (audit.error || !report) {
		failures.push(`${label} didn't load: ${audit.error ?? 'the audit failed.'}`)
	} else {
		if (report.score < options.minScore) {
			failures.push(
				`${label} scores ${report.score}, below the minimum of ${options.minScore}.`
			)
		}
		const drop = baselineReport ? baselineReport.score - report.score : 0
		if (baselineReport && drop > options.maxDrop) {
			const allowed = options.maxDrop ? `, more than the ${options.maxDrop} allowed` : ''
			failures.push(
				`${label} dropped ${formatCount(drop, 'point')} (${baselineReport.score} → ${report.score})${allowed}.`
			)
		}
		if (newProblems.length) {
			const verb = options.failOn === 'warn' ? 'got worse' : 'started failing'
			failures.push(
				`${label}: ${formatCount(newProblems.length, 'check')} ${verb}: ${formatList(newProblems.map((c) => c.title))}.`
			)
		}
	}

	return { ...audit, report, baselineReport, comparison, newProblems, fixed, failures }
}
