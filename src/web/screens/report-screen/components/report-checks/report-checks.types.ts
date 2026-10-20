import type { AuditReport } from '@shared/types'

export interface ReportChecksProps {
	report: AuditReport
}

/** Which checks are listed: everything, only what needs work, or only what passed. */
export type CheckFilter = 'all' | 'issues' | 'passed'
