import { displayUrl } from '@shared/format'
import type { ReportSummary } from '@shared/types'
import { absoluteDate } from '@web/lib/time'
import type { FreshAudit } from '@web/screens/compare-screen'
import type { PickedAudit, SiteReports } from './report-slot.types'

/** Reports grouped by site, keeping the most recently audited sites first. */
export function bySite(reports: ReportSummary[]): SiteReports[] {
	const groups = new Map<string, ReportSummary[]>()
	for (const report of reports) {
		groups.set(report.domain, [...(groups.get(report.domain) ?? []), report])
	}

	return [...groups.entries()].map(([domain, list]) => ({ domain, reports: list }))
}

export function optionLabel(report: ReportSummary): string {
	return `${absoluteDate(report.createdAt)} · ${report.grade} ${report.score} · ${displayUrl(report.finalUrl)}`
}

/** The picked audit, from history or from an audit just run here. */
export function pickedAudit(
	id: string | null,
	reports: ReportSummary[],
	fresh: FreshAudit | null
): PickedAudit | null {
	const report = reports.find((r) => r.id === id)
	if (report) return { ...report, url: report.finalUrl }

	return fresh && fresh.id === id ? fresh : null
}
