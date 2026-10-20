import * as cheerio from 'cheerio'
import { newId } from '@server/audit'
import { AuditError, decodeHtml, normalizeInputUrl, safeFetch, stripWww } from '@server/audit/http'
import { countWords, extractText } from '@server/audit/parse'
import { resolveUrl } from '@server/audit/url'
import { isAllowed, parseRobots, type RobotsTxt } from '@server/audit/robots'
import { CRAWL_ISSUES } from '@shared/crawl-issues'
import { PRIORITY_RANK } from '@shared/grades'
import type {
	AuditProgress,
	CrawlIssueId,
	CrawlIssueSummary,
	CrawlPage,
	CrawlReport
} from '@shared/types'

/** The most pages one crawl may visit, whatever the settings say. */
export const MAX_CRAWL_PAGES = 500

const SKIPPED_EXTENSIONS =
	/\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|pdf|zip|gz|rar|7z|mp4|mov|webm|mp3|wav|ogg|css|js|mjs|json|xml|txt|csv|docx?|xlsx?|pptx?|woff2?|ttf|eot|exe|dmg)$/i

export interface CrawlOptions {
	maxPages: number
	concurrency?: number
	onProgress?(progress: AuditProgress): void
}

interface Visit {
	page: CrawlPage
	/** Internal URLs this page links to, as crawl keys. */
	links: string[]
}

/** URLs that differ only by fragment or www are the same page to the crawler. */
function crawlKey(url: string): string {
	const u = new URL(url)
	u.hash = ''

	return `${stripWww(u.hostname)}${u.pathname}${u.search}`
}

function isCrawlable(url: URL, host: string): boolean {
	return (
		(url.protocol === 'http:' || url.protocol === 'https:') &&
		stripWww(url.hostname) === host &&
		!SKIPPED_EXTENSIONS.test(url.pathname)
	)
}

async function readRobots(origin: string): Promise<RobotsTxt | undefined> {
	try {
		const res = await safeFetch(`${origin}/robots.txt`, {
			timeoutMs: 8000,
			maxBytes: 512 * 1024
		})
		if (res.status === 200 && !res.contentType.includes('text/html')) {
			return parseRobots(res.body.toString('utf8'))
		}
	} catch {
		// crawl without robots.txt
	}

	return undefined
}

async function visit(url: string, depth: number, host: string): Promise<Visit> {
	const page: CrawlPage = { url, finalUrl: url, status: null, depth, issues: [] }
	try {
		const res = await safeFetch(url, { timeoutMs: 15_000, maxBytes: 3 * 1024 * 1024 })
		Object.assign(page, {
			finalUrl: res.url,
			status: res.status,
			contentType: res.contentType,
			responseMs: res.ttfbMs,
			bytes: res.bytes
		})
		if (res.redirects.length) page.issues.push('redirect')
		const final = new URL(res.url)
		if (
			res.status >= 400 ||
			!res.contentType.includes('html') ||
			stripWww(final.hostname) !== host
		) {
			return { page, links: [] }
		}
		const $ = cheerio.load(decodeHtml(res.body, res.contentType))
		const robots = [
			$('meta[name="robots" i]').attr('content') || '',
			res.headers.get('x-robots-tag') || ''
		].join(',')
		const h1s = $('h1')
		const links: string[] = []
		let internal = 0
		let external = 0
		$('a[href]').each((_, el) => {
			const href = resolveUrl($(el).attr('href'), final)
			if (!href) return
			const target = new URL(href)
			if (stripWww(target.hostname) !== host) {
				external++

				return
			}
			internal++
			if (isCrawlable(target, host)) links.push(href)
		})
		const canonicalHref = $('link[rel="canonical" i]').attr('href')
		Object.assign(page, {
			title: $('title').first().text().replace(/\s+/g, ' ').trim(),
			description: ($('meta[name="description" i]').attr('content') || '').trim(),
			h1: h1s.first().text().replace(/\s+/g, ' ').trim(),
			h1Count: h1s.length,
			wordCount: countWords(extractText($)),
			canonical: canonicalHref
				? (resolveUrl(canonicalHref, final) ?? canonicalHref)
				: undefined,
			noindex: /noindex|none/i.test(robots),
			lang: $('html').attr('lang') || undefined,
			imagesMissingAlt: $('img:not([alt])').length,
			internalLinks: internal,
			externalLinks: external
		})

		return { page, links }
	} catch (e) {
		page.error = e instanceof AuditError ? e.message : String(e)

		return { page, links: [] }
	}
}

function pageIssues(page: CrawlPage): CrawlIssueId[] {
	const issues = new Set(page.issues)
	if (page.status === null || page.status >= 400) issues.add('http-error')
	if (page.title === undefined) return [...issues]
	const add = (id: CrawlIssueId, when: unknown) => {
		if (when) issues.add(id)
	}
	const titleLength = page.title.length
	const descriptionLength = page.description?.length ?? 0
	add('missing-title', !page.title)
	add('title-length', page.title && (titleLength < 30 || titleLength > 60))
	add('missing-description', !page.description)
	add(
		'description-length',
		page.description && (descriptionLength < 70 || descriptionLength > 160)
	)
	add('missing-h1', page.h1Count === 0)
	add('multiple-h1', (page.h1Count ?? 0) > 1)
	add('thin-content', (page.wordCount ?? 0) < 200)
	add('noindex', page.noindex)
	add('missing-canonical', !page.canonical)
	add('canonicalized', page.canonical && crawlKey(page.canonical) !== crawlKey(page.finalUrl))
	add('slow-response', (page.responseMs ?? 0) > 1500)
	add('missing-alt', (page.imagesMissingAlt ?? 0) > 0)
	add('missing-lang', !page.lang)

	return [...issues]
}

/** Flags titles and descriptions shared by several indexable pages. */
function markDuplicates(pages: CrawlPage[]): void {
	const indexable = pages.filter((p) => p.status === 200 && !p.noindex && p.title !== undefined)
	const flag = (field: 'title' | 'description', id: CrawlIssueId) => {
		const groups = new Map<string, CrawlPage[]>()
		for (const page of indexable) {
			const value = page[field]?.toLowerCase()
			if (value) groups.set(value, [...(groups.get(value) ?? []), page])
		}
		for (const group of groups.values()) {
			if (group.length > 1) group.forEach((p) => p.issues.push(id))
		}
	}
	flag('title', 'duplicate-title')
	flag('description', 'duplicate-description')
}

function summarize(pages: CrawlPage[]): CrawlIssueSummary[] {
	const counts = new Map<CrawlIssueId, number>()
	pages.forEach((p) => p.issues.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)))

	return [...counts.entries()]
		.map(([id, count]) => ({
			id,
			count,
			title: CRAWL_ISSUES[id].title,
			priority: CRAWL_ISSUES[id].priority
		}))
		.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.count - a.count)
}

/** Crawls a site from a starting URL, staying on its domain, and reports issues page by page. */
export async function runCrawl(input: string, options: CrawlOptions): Promise<CrawlReport> {
	const { concurrency = 4, onProgress } = options
	const maxPages = Math.max(1, Math.min(options.maxPages, MAX_CRAWL_PAGES))
	const started = Date.now()
	const startUrl = normalizeInputUrl(input)
	onProgress?.({ step: 'start', label: 'Reading robots.txt', pct: 2 })

	const first = await safeFetch(startUrl, { timeoutMs: 20_000, readBody: false })
	const origin = new URL(first.url).origin
	const host = stripWww(new URL(first.url).hostname)
	const robots = await readRobots(origin)

	const queue: { url: string; depth: number }[] = [{ url: first.url, depth: 0 }]
	const seen = new Set([crawlKey(startUrl), crawlKey(first.url)])
	const visits: Visit[] = []
	let active = 0

	const worker = async (): Promise<void> => {
		while (visits.length + active < maxPages) {
			const next = queue.shift()
			if (!next) {
				if (!active) return
				await new Promise((resolve) => setTimeout(resolve, 50))
				continue
			}
			const target = new URL(next.url)
			if (robots && !isAllowed(robots, 'OpenSEO', `${target.pathname}${target.search}`))
				continue
			active++
			const result = await visit(next.url, next.depth, host)
			active--
			visits.push(result)
			for (const link of result.links) {
				const key = crawlKey(link)
				if (seen.has(key)) continue
				seen.add(key)
				queue.push({ url: link, depth: next.depth + 1 })
			}
			onProgress?.({
				step: 'crawl',
				label: `Crawled ${visits.length} of up to ${maxPages} pages`,
				pct: Math.min(96, Math.round((visits.length / maxPages) * 96))
			})
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker))

	const pages = visits.map((v) => v.page)
	const brokenKeys = new Set(
		pages.filter((p) => p.status === null || p.status >= 400).map((p) => crawlKey(p.url))
	)
	visits.forEach((v) => {
		if (v.links.some((link) => brokenKeys.has(crawlKey(link))))
			v.page.issues.push('links-to-broken')
	})
	pages.forEach((p) => {
		p.issues = pageIssues(p)
	})
	markDuplicates(pages)
	const healthy = pages.filter(
		(p) => !p.issues.some((id) => CRAWL_ISSUES[id].priority === 'high')
	)

	return {
		id: newId(),
		startUrl: first.url,
		domain: host,
		createdAt: new Date().toISOString(),
		durationMs: Date.now() - started,
		maxPages,
		limitReached: pages.length >= maxPages && queue.length > 0,
		health: pages.length ? Math.round((healthy.length / pages.length) * 100) : 0,
		pages: pages.sort((a, b) => a.depth - b.depth || a.url.localeCompare(b.url)),
		issues: summarize(pages)
	}
}
