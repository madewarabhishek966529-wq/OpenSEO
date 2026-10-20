import type { CrawlIssueId, CrawlReport } from '@shared/types'

export interface CrawlReportScreenProps {
	crawl: CrawlReport
}

/** Which pages the table shows: all of them, or those with one issue. */
export type PageFilter = CrawlIssueId | 'all'
