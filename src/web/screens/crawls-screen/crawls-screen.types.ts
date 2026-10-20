import type { CrawlSummary } from '@shared/types'

export interface CrawlsScreenProps {
	crawls: CrawlSummary[]
	/** The most pages a crawl may visit, from Settings. */
	pageLimit: number
	now: number
}
