import type { ReportSummary } from '@shared/types'

export interface ReportSlotProps {
	label: string
	/** Example address for the audit field. */
	placeholder: string
	reports: ReportSummary[]
	/** The picked audit's ID. */
	value: string | null
	/** The audit picked in the other slot, which can't be picked here too. */
	other: string | null
	now: number
	onChange(id: string | null): void
}

/** The audits of one site, for a group in the list. */
export interface SiteReports {
	domain: string
	reports: ReportSummary[]
}

/** What the slot shows for the picked audit. */
export interface PickedAudit {
	url: string
	score: number
	grade: string
	createdAt?: string
}
