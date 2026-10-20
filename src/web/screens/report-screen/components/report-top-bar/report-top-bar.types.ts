import type { AuditReport } from '@shared/types'

export interface ReportTopBarProps {
	report: AuditReport
	brandName: string
	brandLogo?: string
	/** Show the Compare button, which opens a page behind the admin password when one is set. */
	linkToWorkspace: boolean
}
