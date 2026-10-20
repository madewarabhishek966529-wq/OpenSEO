import type { CrawlSummary } from '@shared/types'

export interface CrawlRowProps {
	crawl: CrawlSummary
	now: number
	onDelete(id: string): void
}
