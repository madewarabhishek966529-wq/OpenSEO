import type { ReportComparison } from '@shared/compare'
import type { PublicSettings } from '@shared/settings'

export interface ComparisonScreenProps {
	comparison: ReportComparison
	settings: PublicSettings
	/** Link to the Compare picker, which needs the admin password when ADMIN_PASSWORD is set. */
	linkToWorkspace: boolean
}
