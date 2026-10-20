import type { ReportSummary } from '@shared/types'

export interface RecentAuditsProps {
	reports: ReportSummary[]
	now: number
}
