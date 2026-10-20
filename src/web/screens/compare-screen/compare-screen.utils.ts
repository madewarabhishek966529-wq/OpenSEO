import { pageKey } from '@shared/compare'
import type { ReportSummary } from '@shared/types'
import { MAX_PAIRS } from './compare-screen.constants'
import type { ReportPair } from './compare-screen.types'

/** The two latest audits of each page audited more than once, most recent first. */
export function suggestedPairs(reports: ReportSummary[]): ReportPair[] {
	const byPage = new Map<string, ReportSummary[]>()
	for (const report of reports) {
		const key = pageKey(report.finalUrl)
		byPage.set(key, [...(byPage.get(key) ?? []), report])
	}

	return [...byPage.values()]
		.filter((list) => list.length > 1)
		.map(([newer, older]) => ({ older, newer }))
		.slice(0, MAX_PAIRS)
}
