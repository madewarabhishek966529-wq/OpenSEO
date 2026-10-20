import { displayUrl } from '@shared/format'
import type { ReportComparison } from '@shared/compare'

/** What's being compared, for the pill in the bar. */
export function subject(comparison: ReportComparison): string {
	const { a, b, samePage } = comparison

	return samePage ? `${displayUrl(b.finalUrl)} · before and after` : `${a.label} vs ${b.label}`
}
