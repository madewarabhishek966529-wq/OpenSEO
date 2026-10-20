import type { ReportSummary } from '@shared/types'

export interface HomeScreenProps {
	recent: ReportSummary[]
	/** When the page was rendered, for "5 min ago" labels. */
	now: number
	pagespeedEnabled: boolean
}
