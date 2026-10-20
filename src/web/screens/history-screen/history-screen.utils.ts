import type { ReportSummary } from '@shared/types'
import type { DomainHistory } from './history-screen.types'

/** Groups reports by domain, keeping the most recently audited domains first. */
export function groupByDomain(reports: ReportSummary[]): DomainHistory[] {
	const groups = new Map<string, ReportSummary[]>()
	for (const report of reports) {
		groups.set(report.domain, [...(groups.get(report.domain) ?? []), report])
	}

	return [...groups.entries()].map(([domain, list]) => ({ domain, reports: list }))
}
