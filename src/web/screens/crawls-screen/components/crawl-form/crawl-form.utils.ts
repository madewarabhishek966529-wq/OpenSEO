import { CRAWL_PAGE_OPTIONS } from '@shared/settings'

/** The page counts someone may pick, up to the limit set in Settings. */
export function pageOptions(limit: number): { value: number; label: string }[] {
	const options = CRAWL_PAGE_OPTIONS.filter((o) => o.value <= limit)

	return options.length ? options : [{ value: limit, label: `${limit} pages` }]
}
