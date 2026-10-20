import type { CheckComparison, ReportComparison } from '@shared/compare'

export interface ChangeRowProps {
	check: CheckComparison
	comparison: ReportComparison
}

/** One line of what a check found, labeled with its side when the two differ. */
export interface SummaryLine {
	side?: string
	text: string
}
