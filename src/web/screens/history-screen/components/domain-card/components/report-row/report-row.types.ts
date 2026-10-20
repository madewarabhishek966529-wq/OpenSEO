import type { ReportSummary } from '@shared/types'

export interface ReportRowProps {
	report: ReportSummary
	now: number
	onDelete(id: string): void
}
