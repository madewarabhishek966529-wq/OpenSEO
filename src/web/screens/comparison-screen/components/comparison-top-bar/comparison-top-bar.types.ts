import type { ReportComparison } from '@shared/compare'

export interface ComparisonTopBarProps {
	comparison: ReportComparison
	brandName: string
	brandLogo?: string
	/** Show the Change button, which opens a page behind the admin password when one is set. */
	linkToWorkspace: boolean
}
