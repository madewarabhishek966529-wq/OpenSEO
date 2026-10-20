import type { CrawlIssueSummary } from '@shared/types'
import type { PageFilter } from '@web/screens/crawl-report-screen'

export interface IssueItemProps {
	issue: CrawlIssueSummary
	fix: string
	selected: boolean
	onSelect(filter: PageFilter): void
}
