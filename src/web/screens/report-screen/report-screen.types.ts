import type { PublicSettings } from '@shared/settings'
import type { AuditReport } from '@shared/types'

export interface ReportScreenProps {
	report: AuditReport
	settings: PublicSettings
	/**
	 * Link to pages like Compare, which need the admin password when ADMIN_PASSWORD is set. Off
	 * then, so the people a report is shared with don't meet a password prompt.
	 */
	linkToWorkspace: boolean
}
