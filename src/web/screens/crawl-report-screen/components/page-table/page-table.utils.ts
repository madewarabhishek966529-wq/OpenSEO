import { displayUrl } from '@shared/format'
import type { CrawlPage } from '@shared/types'

/** The line under a page's URL: its title, or why it has none. */
export function pageNote(page: CrawlPage): string {
	if (page.error) return page.error
	if (page.title) return page.title
	if (page.finalUrl !== page.url) return `Redirects to ${displayUrl(page.finalUrl)}`
	if (page.contentType && !page.contentType.includes('html')) return page.contentType

	return 'No title'
}
