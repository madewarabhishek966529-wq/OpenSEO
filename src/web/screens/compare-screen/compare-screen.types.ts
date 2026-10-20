import type { ReportSummary } from '@shared/types'

export interface CompareScreenProps {
	reports: ReportSummary[]
	/** Audits picked already, from `?a=` and `?b=`. */
	initialA: string | null
	initialB: string | null
	now: number
}

/** The latest two audits of one page. */
export interface ReportPair {
	older: ReportSummary
	newer: ReportSummary
}

/** An audit run from the picker, shown until the page reloads with it in history. */
export interface FreshAudit {
	id: string
	url: string
	score: number
	grade: string
}
