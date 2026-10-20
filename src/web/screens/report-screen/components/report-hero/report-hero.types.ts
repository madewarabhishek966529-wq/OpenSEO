import type { AuditReport } from '@shared/types'

export interface ReportHeroProps {
	report: AuditReport
	/** How many checks need attention. */
	issues: number
}
