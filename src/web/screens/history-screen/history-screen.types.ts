import type { ReportSummary } from '@shared/types'

export interface HistoryScreenProps {
	reports: ReportSummary[]
	now: number
}

/** Every audit of one domain, newest first. */
export interface DomainHistory {
	domain: string
	reports: ReportSummary[]
}
