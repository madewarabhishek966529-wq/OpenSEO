import type { CrawlIssueId, Priority } from './types'

export interface CrawlIssueInfo {
	title: string
	priority: Priority
	/** What to do about it, shown under the issue in the crawl report. */
	fix: string
}

export const CRAWL_ISSUES: Record<CrawlIssueId, CrawlIssueInfo> = {
	'http-error': {
		title: 'Broken page (4xx or 5xx)',
		priority: 'high',
		fix: 'Restore the page, redirect it to its replacement, or remove the links pointing to it.'
	},
	'links-to-broken': {
		title: 'Links to a broken page',
		priority: 'high',
		fix: 'Update or remove links that point to pages returning errors.'
	},
	'missing-title': {
		title: 'Missing title',
		priority: 'high',
		fix: 'Give every page a unique <title> of 50–60 characters.'
	},
	noindex: {
		title: 'Hidden from search (noindex)',
		priority: 'high',
		fix: 'Remove noindex from pages that should appear in search results.'
	},
	'duplicate-title': {
		title: 'Duplicate title',
		priority: 'medium',
		fix: 'Write a distinct title for each page so search engines can tell them apart.'
	},
	'missing-description': {
		title: 'Missing meta description',
		priority: 'medium',
		fix: 'Add a meta description of 120–160 characters to each page.'
	},
	'missing-h1': {
		title: 'Missing H1',
		priority: 'medium',
		fix: 'Add one H1 heading that states the topic of the page.'
	},
	'thin-content': {
		title: 'Thin content (under 200 words)',
		priority: 'medium',
		fix: 'Expand pages that should rank, or keep thin pages out of the index.'
	},
	'slow-response': {
		title: 'Slow response (over 1.5 s)',
		priority: 'medium',
		fix: 'Cache these pages or speed up the queries behind them.'
	},
	'duplicate-description': {
		title: 'Duplicate meta description',
		priority: 'low',
		fix: 'Write a distinct description for each page.'
	},
	'title-length': {
		title: 'Title too short or too long',
		priority: 'low',
		fix: 'Keep titles between 30 and 60 characters.'
	},
	'description-length': {
		title: 'Description too short or too long',
		priority: 'low',
		fix: 'Keep meta descriptions between 70 and 160 characters.'
	},
	'multiple-h1': {
		title: 'More than one H1',
		priority: 'low',
		fix: 'Use one H1 per page and H2–H6 for sections.'
	},
	'missing-alt': {
		title: 'Images without alt text',
		priority: 'low',
		fix: 'Describe meaningful images in their alt attribute; use alt="" for decorative ones.'
	},
	'missing-canonical': {
		title: 'No canonical tag',
		priority: 'low',
		fix: 'Add a canonical tag pointing at the preferred URL of each page.'
	},
	'missing-lang': {
		title: 'No language declared',
		priority: 'low',
		fix: 'Add a lang attribute to the <html> tag.'
	},
	canonicalized: {
		title: 'Canonical points elsewhere',
		priority: 'low',
		fix: 'Check these are intentional duplicates of another URL.'
	},
	redirect: {
		title: 'Redirects',
		priority: 'low',
		fix: 'Update internal links to point straight at the final URL.'
	}
}
