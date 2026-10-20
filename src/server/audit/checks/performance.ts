import { gzipSync } from 'node:zlib'
import type { AuditContext, ResourceInfo } from '@server/audit/context'
import { formatBytes, formatCount, formatMs, formatNumber, formatPercent } from '@shared/format'
import type { CheckResult, Detail, Metric } from '@shared/types'
import { inCategory, listDetail, tableDetail } from './check'

const check = inCategory('performance')

const WEEK_SECONDS = 7 * 24 * 60 * 60
const LARGE_IMAGE = 200 * 1024
const COMPRESSED = /\b(gzip|br|zstd|deflate)\b/i

/** HTML plus every measured resource, in bytes. */
export function pageWeight(ctx: AuditContext): number {
	return ctx.page.bytes + ctx.resources.reduce((total, r) => total + (r.bytes ?? 0), 0)
}

/** Download time of the page plus its slowest resource, since browsers fetch them in parallel. */
export function estimatedLoadMs(ctx: AuditContext): number {
	const slowest = Math.max(0, ...ctx.resources.map((r) => r.timeMs ?? 0))

	return ctx.page.totalMs + slowest
}

function fileName(url: string): string {
	try {
		const { pathname, hostname } = new URL(url)

		return pathname.split('/').filter(Boolean).pop() || hostname
	} catch {
		return url
	}
}

function isCachedLong(r: ResourceInfo): boolean {
	const cache = (r.cacheControl || '').toLowerCase()
	if (/no-store|no-cache/.test(cache)) return false
	if (cache.includes('immutable')) return true
	const maxAge = Number(cache.match(/(?:s-)?max-age=(\d+)/)?.[1] ?? 0)
	if (maxAge >= WEEK_SECONDS) return true
	if (r.expires) {
		const expires = Date.parse(r.expires)

		return Number.isFinite(expires) && expires - Date.now() >= WEEK_SECONDS * 1000
	}

	return false
}

function responseTimeCheck(ctx: AuditContext): CheckResult {
	const ttfb = ctx.page.ttfbMs
	const base = {
		id: 'response-time',
		title: 'Server response time',
		weight: 2,
		priority: 'high' as const
	}
	const summary = `The server took ${formatMs(ttfb)} to start sending the page.`
	if (ttfb < 600) return check({ ...base, status: 'pass', summary })

	return check({
		...base,
		status: ttfb < 1500 ? 'warn' : 'fail',
		summary,
		recommendation:
			'Aim for under 600 ms. Cache rendered pages, use a CDN, and look for slow database queries or plugins.'
	})
}

function loadTimeCheck(ctx: AuditContext): CheckResult {
	const ms = estimatedLoadMs(ctx)
	const base = {
		id: 'load-time',
		title: 'Download time',
		weight: 1.5,
		priority: 'medium' as const
	}
	const summary = `The page and its files downloaded in about ${formatMs(ms)}.`
	const note: Detail = {
		kind: 'list',
		items: [
			'Measured from the OpenSEO server without running JavaScript. Turn on PageSpeed Insights in Settings for real browser timings.'
		]
	}
	if (ms < 2500) return check({ ...base, status: 'pass', summary, details: [note] })

	return check({
		...base,
		status: ms < 5000 ? 'warn' : 'fail',
		summary,
		recommendation:
			'Shrink images, cut unused scripts and serve files from a CDN. Every extra second loses visitors.',
		details: [note]
	})
}

function pageSizeCheck(ctx: AuditContext): CheckResult {
	const total = pageWeight(ctx)
	const byType = (type: ResourceInfo['type']) =>
		ctx.resources.filter((r) => r.type === type).reduce((n, r) => n + (r.bytes ?? 0), 0)
	const items: Metric[] = [
		{ label: 'HTML', value: formatBytes(ctx.page.bytes) },
		{ label: 'Scripts', value: formatBytes(byType('script')) },
		{ label: 'Styles', value: formatBytes(byType('stylesheet')) },
		{ label: 'Images', value: formatBytes(byType('image')) },
		{ label: 'Fonts', value: formatBytes(byType('font')) }
	]
	const details: Detail[] = [{ kind: 'metrics', items }]
	if (ctx.resources.length < ctx.resourcesDiscovered) {
		details.push({
			kind: 'list',
			items: [
				`Measured ${ctx.resources.length} of ${formatCount(ctx.resourcesDiscovered, 'file')} the page loads.`
			]
		})
	}
	const base = { id: 'page-size', title: 'Page size', weight: 2, priority: 'medium' as const }
	const summary = `The page weighs ${formatBytes(total)}.`
	if (total < 2 * 1024 * 1024) return check({ ...base, status: 'pass', summary, details })

	return check({
		...base,
		status: total < 5 * 1024 * 1024 ? 'warn' : 'fail',
		summary,
		recommendation:
			"Keep pages under 2 MB. Compress and resize images, and remove scripts the page doesn't need.",
		details
	})
}

function requestsCheck(ctx: AuditContext): CheckResult {
	const count = 1 + ctx.resourcesDiscovered
	const base = {
		id: 'requests',
		title: 'Number of requests',
		weight: 1.5,
		priority: 'medium' as const
	}
	const summary = `The page makes ${formatCount(count, 'request')} for its HTML, scripts, styles and images.`
	if (count < 50) return check({ ...base, status: 'pass', summary })

	return check({
		...base,
		status: count < 100 ? 'warn' : 'fail',
		summary,
		recommendation:
			'Combine files, lazy-load images below the fold and drop third-party scripts you can live without.'
	})
}

function compressionCheck(ctx: AuditContext): CheckResult {
	const encoding = ctx.page.headers.get('content-encoding') || ''
	const uncompressed = ctx.resources.filter(
		(r) =>
			(r.type === 'script' || r.type === 'stylesheet') &&
			(r.status ?? 500) < 400 &&
			(r.bytes ?? 0) > 1024 &&
			!COMPRESSED.test(r.encoding || '')
	)
	const base = { id: 'compression', title: 'Compression', weight: 2, priority: 'high' as const }
	if (!COMPRESSED.test(encoding)) {
		const gzipped = gzipSync(ctx.page.body).byteLength

		return check({
			...base,
			status: 'fail',
			summary: `The HTML is sent uncompressed. Gzip would shrink it from ${formatBytes(ctx.page.bytes)} to ${formatBytes(gzipped)}.`,
			recommendation:
				'Turn on gzip or Brotli compression on the server or CDN for HTML, CSS, JavaScript and SVG.',
			details: uncompressed.length ? [listDetail(uncompressed.map((r) => r.url))] : undefined
		})
	}
	if (uncompressed.length) {
		return check({
			...base,
			status: 'warn',
			summary: `The HTML is compressed (${encoding}), but ${formatCount(uncompressed.length, 'script or stylesheet', 'scripts and stylesheets')} aren't.`,
			recommendation:
				'Enable compression for every text file, including those on other domains you control.',
			details: [listDetail(uncompressed.map((r) => r.url))]
		})
	}

	return check({ ...base, status: 'pass', summary: `The page is compressed with ${encoding}.` })
}

function http2Check(ctx: AuditContext): CheckResult {
	const altSvc = ctx.page.headers.get('alt-svc') || ''
	const http3 = /\bh3\b/.test(altSvc)
	const base = { id: 'http2', title: 'HTTP/2', weight: 1, priority: 'medium' as const }
	if (ctx.tls?.alpn === 'h2') {
		return check({
			...base,
			status: 'pass',
			summary: http3
				? 'The server supports HTTP/2 and HTTP/3.'
				: 'The server supports HTTP/2.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: "The server doesn't offer HTTP/2.",
		recommendation:
			'Enable HTTP/2 (most CDNs and modern servers support it). It loads many small files much faster than HTTP/1.1.'
	})
}

function cachingCheck(ctx: AuditContext): CheckResult {
	const statics = ctx.resources.filter((r) => (r.status ?? 500) < 400 && r.bytes)
	const short = statics.filter((r) => !isCachedLong(r))
	const base = { id: 'caching', title: 'Browser caching', weight: 1, priority: 'medium' as const }
	if (!statics.length) {
		return check({ ...base, status: 'pass', summary: 'The page has no files to cache.' })
	}
	const cached = statics.length - short.length
	const share = cached / statics.length
	const summary = `${formatPercent(cached, statics.length)} of files are cached for a week or more.`
	if (share >= 0.8) return check({ ...base, status: 'pass', summary })

	return check({
		...base,
		status: share >= 0.5 ? 'warn' : 'fail',
		summary,
		recommendation:
			'Send Cache-Control: max-age=31536000, immutable for versioned files, so repeat visitors load them from disk.',
		details: [
			tableDetail(
				['File', 'Cache-Control'],
				short.map((r) => [fileName(r.url), r.cacheControl || 'Not set'])
			)
		]
	})
}

function minificationCheck(ctx: AuditContext): CheckResult {
	const unminified = ctx.resources.filter((r) => r.minified === false)
	const base = {
		id: 'minification',
		title: 'Minified JavaScript and CSS',
		weight: 1,
		priority: 'medium' as const
	}
	if (!unminified.length) {
		return check({ ...base, status: 'pass', summary: 'Scripts and stylesheets look minified.' })
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(unminified.length, 'file')} ${unminified.length === 1 ? "doesn't" : "don't"} look minified.`,
		recommendation:
			'Minify JavaScript and CSS in your build step (most bundlers do this in production mode).',
		details: [
			tableDetail(
				['File', 'Size'],
				unminified.map((r) => [fileName(r.url), formatBytes(r.bytes ?? 0)])
			)
		]
	})
}

function imagesCheck(ctx: AuditContext): CheckResult {
	const images = ctx.resources.filter(
		(r) => r.type === 'image' && (r.status ?? 500) < 400 && r.bytes
	)
	const large = images.filter(
		(r) => (r.bytes ?? 0) > LARGE_IMAGE && !/svg/.test(r.contentType || '')
	)
	const modern = images.filter((r) => /webp|avif|svg/.test(r.contentType || ''))
	const total = images.reduce((n, r) => n + (r.bytes ?? 0), 0)
	const base = {
		id: 'images',
		title: 'Image optimization',
		weight: 1.5,
		priority: 'medium' as const
	}
	if (!images.length) {
		return check({ ...base, status: 'pass', summary: 'The page loads no images.' })
	}
	const details: Detail[] = [
		{
			kind: 'metrics',
			items: [
				{ label: 'Images', value: formatNumber(images.length) },
				{ label: 'Total', value: formatBytes(total) },
				{ label: 'WebP, AVIF or SVG', value: formatNumber(modern.length) }
			]
		}
	]
	if (large.length) {
		details.push(
			tableDetail(
				['Image', 'Size', 'Type'],
				large.map((r) => [
					fileName(r.url),
					formatBytes(r.bytes ?? 0),
					(r.contentType || '').replace('image/', '')
				])
			)
		)
	}
	const legacyOnly = !modern.length && images.length >= 3
	if (!large.length && !legacyOnly) {
		return check({
			...base,
			status: 'pass',
			summary: `${formatCount(images.length, 'image')} totalling ${formatBytes(total)}, none oversized.`,
			details
		})
	}

	return check({
		...base,
		status: large.length >= 3 || total > 3 * 1024 * 1024 ? 'fail' : 'warn',
		summary: large.length
			? `${formatCount(large.length, 'image')} ${large.length === 1 ? 'is' : 'are'} larger than 200 KB.`
			: 'Images are served in older formats only (JPEG, PNG or GIF).',
		recommendation:
			'Resize images to the size they display at, and serve WebP or AVIF. Both are often 30–50% smaller than JPEG.',
		details
	})
}

function renderBlockingCheck(ctx: AuditContext): CheckResult {
	const scripts = ctx.resources.filter((r) => r.type === 'script' && r.blocking)
	const styles = ctx.resources.filter((r) => r.type === 'stylesheet' && r.blocking)
	const base = {
		id: 'render-blocking',
		title: 'Render-blocking files',
		weight: 1,
		priority: 'medium' as const
	}
	if (!scripts.length && styles.length <= 3) {
		return check({
			...base,
			status: 'pass',
			summary: styles.length
				? `Only ${formatCount(styles.length, 'stylesheet')} must load before the page can show.`
				: 'Nothing blocks the page from rendering.'
		})
	}

	return check({
		...base,
		status: scripts.length > 5 ? 'fail' : 'warn',
		summary: `${formatCount(scripts.length, 'script')} and ${formatCount(styles.length, 'stylesheet')} in the <head> block rendering.`,
		recommendation:
			'Add defer or async to scripts in the <head>, inline the CSS needed for the first screen, and load the rest later.',
		details: [listDetail([...scripts, ...styles].map((r) => r.url))]
	})
}

function imageDimensionsCheck(ctx: AuditContext): CheckResult {
	const missing = ctx.images.filter((i) => !i.width || !i.height)
	const base = {
		id: 'image-dimensions',
		title: 'Image dimensions',
		weight: 0.5,
		priority: 'low' as const
	}
	if (!missing.length) {
		return check({
			...base,
			status: 'pass',
			summary: ctx.images.length
				? 'Every image declares its width and height.'
				: 'The page has no images.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(missing.length, 'image')} ${missing.length === 1 ? 'has' : 'have'} no width and height.`,
		recommendation:
			"Set width and height on images so the browser reserves space and the layout doesn't jump (Cumulative Layout Shift).",
		details: [listDetail(missing.map((i) => i.src))]
	})
}

function lazyLoadingCheck(ctx: AuditContext): CheckResult {
	const lazy = ctx.images.filter((i) => i.loading === 'lazy').length
	const base = {
		id: 'lazy-loading',
		title: 'Lazy-loaded images',
		weight: 0.5,
		priority: 'low' as const
	}
	if (ctx.images.length <= 5 || lazy) {
		return check({
			...base,
			status: 'pass',
			summary: lazy
				? `${formatCount(lazy, 'image')} load only when scrolled into view.`
				: 'The page has few images, so lazy loading matters little.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `None of the ${formatCount(ctx.images.length, 'image')} are lazy-loaded.`,
		recommendation:
			'Add loading="lazy" to images below the first screen so they load only when needed.'
	})
}

function redirectsCheck(ctx: AuditContext): CheckResult {
	const hops = ctx.page.redirects
	const base = { id: 'redirects', title: 'Redirects', weight: 1, priority: 'medium' as const }
	const chain = [
		...hops.map((h) => `${h.status}  ${h.url}`),
		`${ctx.page.status}  ${ctx.page.url}`
	]
	if (hops.length <= 1) {
		return check({
			...base,
			status: 'pass',
			summary: hops.length
				? 'The URL redirects once before the page loads.'
				: 'The page loads without redirects.',
			details: hops.length ? [listDetail(chain)] : undefined
		})
	}

	return check({
		...base,
		status: hops.length >= 4 ? 'fail' : 'warn',
		summary: `The URL goes through ${formatCount(hops.length, 'redirect')} before the page loads.`,
		recommendation:
			'Link straight to the final URL and collapse chains into a single redirect.',
		details: [listDetail(chain)]
	})
}

function domSizeCheck(ctx: AuditContext): CheckResult {
	const nodes = ctx.$('body *').length
	const base = { id: 'dom-size', title: 'DOM size', weight: 0.5, priority: 'low' as const }
	const summary = `The page has ${formatCount(nodes, 'element')}.`
	if (nodes <= 1500) return check({ ...base, status: 'pass', summary })

	return check({
		...base,
		status: nodes <= 3000 ? 'warn' : 'fail',
		summary,
		recommendation:
			"Large pages use more memory and render slower. Paginate long lists and remove hidden markup you don't use."
	})
}

function webVitalsCheck(ctx: AuditContext): CheckResult {
	const base = { id: 'web-vitals', title: 'Core Web Vitals', priority: 'high' as const }
	const { pagespeed } = ctx
	if (!ctx.pagespeedEnabled) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary:
				'Turn on PageSpeed Insights in Settings to measure Core Web Vitals in a real browser.'
		})
	}
	const mobile = pagespeed?.mobile
	if (!mobile || mobile.performance == null) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: `PageSpeed Insights didn't return results${pagespeed?.error ? `: ${pagespeed.error}` : '.'}`
		})
	}
	const details: Detail[] = [{ kind: 'metrics', items: mobile.metrics }]
	if (mobile.field?.length) details.push({ kind: 'metrics', items: mobile.field })
	if (pagespeed?.desktop?.performance != null) {
		details.push({
			kind: 'kv',
			items: [
				['Mobile performance', `${mobile.performance}/100`],
				['Desktop performance', `${pagespeed.desktop.performance}/100`]
			]
		})
	}
	const summary = `Lighthouse gives the mobile page a performance score of ${mobile.performance}/100.`
	if (mobile.performance >= 90)
		return check({ ...base, weight: 3, status: 'pass', summary, details })

	return check({
		...base,
		weight: 3,
		status: mobile.performance >= 50 ? 'warn' : 'fail',
		summary,
		recommendation:
			'Focus on Largest Contentful Paint (load the main image or text early) and Total Blocking Time (less JavaScript on load).',
		details
	})
}

export function performanceChecks(ctx: AuditContext): CheckResult[] {
	return [
		webVitalsCheck(ctx),
		responseTimeCheck(ctx),
		loadTimeCheck(ctx),
		pageSizeCheck(ctx),
		requestsCheck(ctx),
		compressionCheck(ctx),
		http2Check(ctx),
		imagesCheck(ctx),
		cachingCheck(ctx),
		minificationCheck(ctx),
		renderBlockingCheck(ctx),
		redirectsCheck(ctx),
		imageDimensionsCheck(ctx),
		lazyLoadingCheck(ctx),
		domSizeCheck(ctx)
	]
}
