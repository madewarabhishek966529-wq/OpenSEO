import { gunzipSync } from 'node:zlib'
import type {
	CheerioRoot,
	Gathered,
	LinkCheck,
	LinkInfo,
	ParsedPage,
	ResourceInfo,
	ResourceType
} from './context'
import { AuditError, mapLimit, safeFetch } from './http'
import { inspectDns, inspectTls } from './network'
import { parseRobots } from './robots'
import { resolveUrl } from './url'
import { gatherSharing } from './sharing'

/** Resources measured per audit. The rest are counted but not downloaded. */
const MAX_RESOURCES = 80
const RESOURCE_ORDER: ResourceType[] = ['stylesheet', 'script', 'font', 'image']
const BLOCKED_STATUSES = [401, 403, 429, 999]

export interface GatherOptions {
	brokenLinkLimit: number
	/** Called as each group of requests finishes, with a short description. */
	onStep(label: string): void
}

async function readRobotsAndSitemap(origin: string) {
	const robots: Gathered['robots'] = { url: `${origin}/robots.txt`, found: false }
	try {
		const res = await safeFetch(robots.url, { timeoutMs: 8000, maxBytes: 512 * 1024 })
		robots.status = res.status
		if (res.status === 200 && !res.contentType.includes('text/html')) {
			robots.found = true
			robots.parsed = parseRobots(res.body.toString('utf8'))
		}
	} catch (e) {
		robots.error = (e as Error).message
	}

	const candidates = [
		...(robots.parsed?.sitemaps.slice(0, 3) ?? []).map((url) => ({
			url,
			source: 'robots.txt' as const
		})),
		...['sitemap.xml', 'sitemap_index.xml', 'wp-sitemap.xml'].map((file) => ({
			url: `${origin}/${file}`,
			source: 'default location' as const
		}))
	]
	const sitemap: Gathered['sitemap'] = { found: false, tried: [] }
	for (const candidate of candidates) {
		if (sitemap.tried.includes(candidate.url)) continue
		sitemap.tried.push(candidate.url)
		try {
			const res = await safeFetch(candidate.url, {
				timeoutMs: 10_000,
				maxBytes: 20 * 1024 * 1024,
				headers: { accept: 'application/xml,text/xml,*/*' }
			})
			if (res.status !== 200) continue
			const isGzip = res.body[0] === 0x1f && res.body[1] === 0x8b
			const xml = (isGzip ? gunzipSync(res.body) : res.body).toString('utf8')
			if (!/<urlset|<sitemapindex/i.test(xml)) continue
			Object.assign(sitemap, {
				found: true,
				url: candidate.url,
				source: candidate.source,
				isIndex: /<sitemapindex/i.test(xml),
				urlCount: (xml.match(/<loc>/gi) || []).length
			})
			break
		} catch {
			// try the next candidate
		}
	}

	return { robots, sitemap }
}

async function findLlmsTxt(origin: string): Promise<Gathered['llmsTxt']> {
	const url = `${origin}/llms.txt`
	try {
		const res = await safeFetch(url, { timeoutMs: 8000, maxBytes: 256 * 1024 })
		const body = res.body.toString('utf8')
		const isText = !res.contentType.includes('text/html') && !/^\s*<(!doctype|html)/i.test(body)
		if (res.status === 200 && isText && body.trim())
			return { url, found: true, bytes: res.bytes }
	} catch {
		// treated as missing
	}

	return { url, found: false }
}

async function checkHttpRedirect(finalUrl: URL): Promise<Gathered['httpRedirect']> {
	try {
		const res = await safeFetch(`http://${finalUrl.host}${finalUrl.pathname}`, {
			timeoutMs: 8000,
			readBody: false
		})

		return {
			checked: true,
			redirectsToHttps: res.url.startsWith('https://'),
			finalUrl: res.url
		}
	} catch (e) {
		return { checked: true, redirectsToHttps: false, error: (e as Error).message }
	}
}

function discoverResources($: CheerioRoot, base: URL) {
	const found = new Map<string, ResourceInfo>()
	const add = (url: string | null, type: ResourceType, inHead: boolean, blocking: boolean) => {
		if (url && !found.has(url)) found.set(url, { url, type, inHead, blocking })
	}
	let inlineScriptBytes = 0
	let inlineStyleBytes = 0

	$('script').each((_, el) => {
		const $el = $(el)
		const type = ($el.attr('type') || '').toLowerCase()
		if (type && !/javascript|module/.test(type)) return
		const src = $el.attr('src')
		if (!src) {
			inlineScriptBytes += Buffer.byteLength($el.contents().text())

			return
		}
		const inHead = $el.parents('head').length > 0
		const deferred =
			$el.attr('async') !== undefined || $el.attr('defer') !== undefined || type === 'module'
		add(resolveUrl(src, base), 'script', inHead, inHead && !deferred)
	})
	$('style').each((_, el) => {
		inlineStyleBytes += Buffer.byteLength($(el).text())
	})
	$('link[href]').each((_, el) => {
		const $el = $(el)
		const rel = ($el.attr('rel') || '').toLowerCase().split(/\s+/)
		const inHead = $el.parents('head').length > 0
		const url = resolveUrl($el.attr('href'), base)
		if (rel.includes('stylesheet')) {
			const media = ($el.attr('media') || 'all').toLowerCase()
			add(url, 'stylesheet', inHead, inHead && ['all', 'screen', ''].includes(media))
		} else if (rel.includes('preload') && $el.attr('as') === 'font') {
			add(url, 'font', inHead, false)
		}
	})
	$('img').each((_, el) => {
		add(resolveUrl($(el).attr('src') || $(el).attr('data-src'), base), 'image', false, false)
	})

	return { list: [...found.values()], inlineScriptBytes, inlineStyleBytes }
}

/** A rough test: minified code has long lines, little whitespace and few comments. */
export function looksMinified(code: string): boolean {
	if (code.length < 2048) return true
	const averageLine = code.length / code.split('\n').length
	const whitespace = (code.match(/\s/g) || []).length / code.length
	const comments =
		(code.match(/\/\*[\s\S]*?\*\//g) || []).reduce((n, c) => n + c.length, 0) / code.length

	return (averageLine > 180 || whitespace < 0.12) && comments < 0.08
}

async function measureResource(resource: ResourceInfo): Promise<ResourceInfo> {
	const isCode = resource.type === 'script' || resource.type === 'stylesheet'
	const options = { timeoutMs: 10_000, maxBytes: 15 * 1024 * 1024, headers: { accept: '*/*' } }
	try {
		let res = await safeFetch(resource.url, { ...options, readBody: isCode })
		const length = Number(res.headers.get('content-length') || 0)
		// Images without a Content-Length have to be downloaded to be measured.
		if (!isCode && !length && res.status < 400) {
			res = await safeFetch(resource.url, { ...options, readBody: true })
		}
		const encoding = res.headers.get('content-encoding')
		const bytes = isCode || !length ? res.bytes : length

		return {
			...resource,
			status: res.status,
			bytes,
			transferBytes: length && encoding ? length : bytes,
			contentType: res.contentType,
			encoding,
			cacheControl: res.headers.get('cache-control'),
			expires: res.headers.get('expires'),
			timeMs: res.totalMs,
			minified:
				isCode && res.status < 400 && res.bytes > 0
					? looksMinified(res.body.toString('utf8'))
					: undefined
		}
	} catch (e) {
		return { ...resource, error: (e as Error).message }
	}
}

async function measureResources($: CheerioRoot, finalUrl: URL) {
	const { list, inlineScriptBytes, inlineStyleBytes } = discoverResources($, finalUrl)
	const picked = [...list]
		.sort((a, b) => RESOURCE_ORDER.indexOf(a.type) - RESOURCE_ORDER.indexOf(b.type))
		.slice(0, MAX_RESOURCES)

	return {
		resources: await mapLimit(picked, 10, measureResource),
		resourcesDiscovered: list.length,
		inlineScriptBytes,
		inlineStyleBytes
	}
}

async function checkLink(url: string, internal: boolean): Promise<LinkCheck> {
	try {
		let res = await safeFetch(url, { method: 'HEAD', timeoutMs: 8000, readBody: false })
		// Plenty of servers reject HEAD; ask again with GET before calling the link broken.
		if ([400, 403, 405, 406, 501].includes(res.status)) {
			res = await safeFetch(url, { method: 'GET', timeoutMs: 8000, readBody: false })
		}
		const state =
			res.status < 400 ? 'ok' : BLOCKED_STATUSES.includes(res.status) ? 'blocked' : 'broken'

		return { url, status: res.status, state, internal }
	} catch (e) {
		const err = e as AuditError

		return {
			url,
			status: null,
			state: err.code === 'dns' ? 'broken' : 'unreachable',
			internal,
			error: err.message
		}
	}
}

async function checkLinks(links: LinkInfo[], limit: number) {
	const unique = new Map<string, boolean>()
	for (const link of links) {
		const url = link.href.split('#')[0]
		if (!unique.has(url)) unique.set(url, link.internal)
	}
	const all = [...unique.entries()]
	const internal = all.filter(([, isInternal]) => isInternal).slice(0, Math.ceil(limit * 0.6))
	const external = all.filter(([, isInternal]) => !isInternal).slice(0, limit - internal.length)
	const toCheck = [...internal, ...external]

	return {
		linkChecks: await mapLimit(toCheck, 8, ([url, isInternal]) => checkLink(url, isInternal)),
		linksDiscovered: unique.size
	}
}

/** Makes every request the checks need beyond the page itself, in parallel. */
export async function gather(page: ParsedPage, options: GatherOptions): Promise<Gathered> {
	const { $, finalUrl, links } = page
	const { brokenLinkLimit, onStep } = options

	const step = async <T>(label: string, work: Promise<T>): Promise<T> => {
		const result = await work
		onStep(label)

		return result
	}
	const isHttps = finalUrl.protocol === 'https:'

	const [files, llmsTxt, sharing, httpRedirect, network, resources, linkResults] =
		await Promise.all([
			step('Read robots.txt and the sitemap', readRobotsAndSitemap(finalUrl.origin)),
			findLlmsTxt(finalUrl.origin),
			step('Checked share images and icons', gatherSharing(page)),
			checkHttpRedirect(finalUrl),
			step(
				'Checked the SSL certificate, DNS and HTTP/2',
				Promise.all([
					isHttps
						? inspectTls(finalUrl.hostname, Number(finalUrl.port) || 443)
						: Promise.resolve(undefined),
					inspectDns(finalUrl.hostname).catch(() => undefined)
				])
			),
			step('Measured scripts, stylesheets and images', measureResources($, finalUrl)),
			step('Checked the links on the page', checkLinks(links, brokenLinkLimit))
		])

	return {
		...files,
		llmsTxt,
		sharing,
		httpRedirect,
		tls: network[0],
		dns: network[1],
		...resources,
		...linkResults
	}
}
