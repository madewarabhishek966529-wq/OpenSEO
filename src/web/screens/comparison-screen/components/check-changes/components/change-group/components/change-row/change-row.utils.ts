import { SEVERITY, type CheckComparison, type ReportComparison } from '@shared/compare'
import type { SummaryLine } from './change-row.types'

/** Both summaries when they differ, otherwise the one that applies. */
export function summaryLines(check: CheckComparison, comparison: ReportComparison): SummaryLine[] {
	const { a, b } = check
	if (a && b && a.summary !== b.summary) {
		return [
			{ side: comparison.a.label, text: a.summary },
			{ side: comparison.b.label, text: b.summary }
		]
	}

	return [{ text: (b ?? a)?.summary ?? '' }]
}

/** The check in the report that has the problem (B unless only A has it), to read the fix. */
export function checkLink(check: CheckComparison, comparison: ReportComparison): string {
	const inB = check.b && (SEVERITY[check.b.status] > 0 || !check.a)
	const report = inB || !check.a ? comparison.b : comparison.a

	return `/report/${report.id}#check-${check.id}`
}
