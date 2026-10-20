import { describe, expect, it } from 'vitest'
import { aiChecks } from '@server/audit/checks/ai'
import { linkChecks } from '@server/audit/checks/links'
import { onPageChecks } from '@server/audit/checks/onpage'
import { securityChecks } from '@server/audit/checks/security'
import { socialChecks } from '@server/audit/checks/social'
import { usabilityChecks } from '@server/audit/checks/usability'
import type { AuditContext, Gathered, ParsedPage } from '@server/audit/context'
import type { SafeFetchResult } from '@server/audit/http'
import { parsePage } from '@server/audit/parse'
import { buildPreviews } from '@server/audit/previews'
import { parseRobots } from '@server/audit/robots'
import type { CheckResult, IconAsset, ImageAsset, SharingReport, WebManifest } from '@shared/types'

const URL_ = 'https://shop.example.com/'

function fakePage(html: string, headers: Record<string, string> = {}): SafeFetchResult {
	return {
		url: URL_,
		status: 200,
		ok: true,
		headers: new Headers({ 'content-type': 'text/html; charset=utf-8', ...headers }),
		redirects: [],
		body: Buffer.from(html),
		bytes: Buffer.byteLength(html),
		truncated: false,
		ttfbMs: 120,
		totalMs: 300,
		contentType: 'text/html; charset=utf-8'
	}
}

interface Assets {
	ogImage?: ImageAsset
	icons?: IconAsset[]
	manifest?: WebManifest
}

/** What gatherSharing would report, from images we pretend to have downloaded. */
function sharingFor(page: ParsedPage, assets: Assets = {}): SharingReport {
	const { ogImage, icons = [], manifest } = assets

	return {
		previews: buildPreviews({
			meta: page.social,
			title: page.title,
			description: page.description,
			text: page.text,
			finalUrl: page.finalUrl,
			ogImage,
			icons
		}),
		icons,
		ogImage,
		manifest,
		themeColor: page.social.themeColor,
		tags: page.social.tags
	}
}

/** An audit context for a page, without any network requests. */
function contextFor(
	html: string,
	gathered: Partial<Gathered> = {},
	headers: Record<string, string> = {}
): AuditContext {
	const page = fakePage(html, headers)
	const parsed = parsePage(page)

	return {
		...parsed,
		robots: { url: `${URL_}robots.txt`, found: false },
		sitemap: { found: false, tried: [] },
		llmsTxt: { url: `${URL_}llms.txt`, found: false },
		sharing: sharingFor(parsed),
		httpRedirect: { checked: true, redirectsToHttps: true },
		resources: [],
		resourcesDiscovered: 0,
		inlineScriptBytes: 0,
		inlineStyleBytes: 0,
		linkChecks: [],
		linksDiscovered: 0,
		...gathered,
		inputUrl: URL_,
		page,
		pagespeedEnabled: false
	}
}

/** A context whose share image, icons and manifest have been "downloaded". */
function contextWithAssets(html: string, assets: Assets): AuditContext {
	return contextFor(html, { sharing: sharingFor(parsePage(fakePage(html)), assets) })
}

function image(overrides: Partial<ImageAsset> = {}): ImageAsset {
	return {
		url: 'https://shop.example.com/og.jpg',
		status: 200,
		ok: true,
		contentType: 'image/jpeg',
		format: 'jpeg',
		width: 1200,
		height: 630,
		bytes: 180_000,
		...overrides
	}
}

function icon(kind: IconAsset['kind'], overrides: Partial<IconAsset> = {}): IconAsset {
	return {
		...image({
			url: `https://shop.example.com/${kind}.png`,
			format: 'png',
			width: 180,
			height: 180
		}),
		contentType: 'image/png',
		bytes: 4_000,
		kind,
		source: `<link rel="${kind === 'favicon' ? 'icon' : kind}">`,
		...overrides
	}
}

const GOOD_ASSETS: Assets = {
	ogImage: image(),
	icons: [
		icon('favicon', { url: 'https://shop.example.com/favicon.svg', format: 'svg' }),
		icon('apple-touch-icon')
	],
	manifest: {
		url: 'https://shop.example.com/manifest.webmanifest',
		ok: true,
		name: 'Example Shop',
		iconSizes: ['192x192', '512x512']
	}
}

function find(checks: CheckResult[], id: string): CheckResult {
	const found = checks.find((c) => c.id === id)
	if (!found) throw new Error(`No check ${id}`)

	return found
}

const GOOD_PAGE = `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Handmade leather bags made in Dublin | Example Shop</title>
	<meta name="description" content="Handmade leather bags, cut and stitched in Dublin. Built to last for decades, repaired for free, and shipped anywhere in Europe within three days.">
	<link rel="canonical" href="https://shop.example.com/">
	<meta property="og:title" content="Handmade leather bags">
	<meta property="og:description" content="Cut and stitched in Dublin.">
	<meta property="og:image" content="https://shop.example.com/og.jpg">
	<meta property="og:url" content="https://shop.example.com/">
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="Example Shop">
	<meta name="twitter:card" content="summary_large_image">
	<meta name="theme-color" content="#7a4b2a">
	<link rel="icon" href="/favicon.svg" type="image/svg+xml">
	<link rel="apple-touch-icon" href="/apple-touch-icon.png">
	<link rel="manifest" href="/manifest.webmanifest">
	<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Example Shop","sameAs":["https://instagram.com/exampleshop"]}</script>
</head>
<body>
	<header><nav><a href="/bags">Leather bags</a></nav></header>
	<main>
		<h1>Handmade leather bags</h1>
		<h2>Why leather bags last</h2>
		<p>${'Our handmade leather bags are cut from full-grain leather. '.repeat(70)}</p>
		<img src="/bag.jpg" alt="A brown leather bag" width="800" height="600">
		<a href="https://instagram.com/exampleshop">Instagram</a>
	</main>
	<footer>© Example Shop</footer>
</body>
</html>`

describe('a well-built page', () => {
	const ctx = contextWithAssets(GOOD_PAGE, GOOD_ASSETS)
	const checks = [
		...onPageChecks(ctx),
		...usabilityChecks(ctx),
		...socialChecks(ctx),
		...aiChecks(ctx)
	]

	it.each([
		'title',
		'meta-description',
		'h1',
		'headings',
		'content-length',
		'keywords',
		'image-alt',
		'canonical',
		'indexable',
		'structured-data',
		'lang',
		'viewport',
		'open-graph',
		'og-image',
		'twitter-card',
		'favicon',
		'apple-touch-icon',
		'web-manifest',
		'theme-color',
		'social-profiles',
		'content-in-html',
		'entity-schema',
		'semantic-html'
	])('passes %s', (id) => {
		expect(find(checks, id).status).toBe('pass')
	})
})

describe('a neglected page', () => {
	const ctx = contextFor(
		`<html><head><meta name="robots" content="noindex"></head><body>
			<h1>One</h1><h1>Two</h1>
			<img src="/a.png"><img src="/b.png">
			<a href="/x"></a>
			<script src="http://cdn.example.com/app.js"></script>
			<font>old</font>
		</body></html>`
	)
	const checks = [
		...onPageChecks(ctx),
		...usabilityChecks(ctx),
		...securityChecks(ctx),
		...linkChecks(ctx)
	]

	it.each([
		['title', 'fail'],
		['meta-description', 'fail'],
		['h1', 'warn'],
		['image-alt', 'fail'],
		['indexable', 'fail'],
		['viewport', 'fail'],
		['mixed-content', 'fail'],
		['deprecated-html', 'warn'],
		['anchor-text', 'warn'],
		['content-length', 'fail']
	])('flags %s as %s', (id, status) => {
		expect(find(checks, id).status).toBe(status)
	})

	it('says how to fix every problem', () => {
		const problems = checks.filter((c) => c.status === 'fail' || c.status === 'warn')
		expect(problems.every((c) => Boolean(c.recommendation))).toBe(true)
	})
})

describe('AI crawler access', () => {
	it('warns when AI search crawlers are blocked', () => {
		const ctx = contextFor(GOOD_PAGE, {
			robots: {
				url: `${URL_}robots.txt`,
				found: true,
				parsed: parseRobots('User-agent: OAI-SearchBot\nDisallow: /')
			}
		})
		expect(find(aiChecks(ctx), 'ai-crawlers').status).toBe('warn')
	})

	it('accepts blocking only training crawlers', () => {
		const ctx = contextFor(GOOD_PAGE, {
			robots: {
				url: `${URL_}robots.txt`,
				found: true,
				parsed: parseRobots('User-agent: GPTBot\nDisallow: /')
			}
		})
		const result = find(aiChecks(ctx), 'ai-crawlers')
		expect(result.status).toBe('pass')
		expect(result.summary).toMatch(/1 training crawler is blocked/)
	})
})

const BARE_PAGE = '<html><head><title>Leather bags</title></head><body><p>Bags.</p></body></html>'

describe('share images and icons', () => {
	const statusOf = (ctx: AuditContext, id: string) =>
		find([...socialChecks(ctx), ...usabilityChecks(ctx)], id).status

	it('flags a page with no social tags or icons', () => {
		const ctx = contextFor(BARE_PAGE)
		expect(statusOf(ctx, 'open-graph')).toBe('fail')
		expect(statusOf(ctx, 'og-image')).toBe('fail')
		expect(statusOf(ctx, 'twitter-card')).toBe('warn')
		expect(statusOf(ctx, 'favicon')).toBe('warn')
		expect(statusOf(ctx, 'apple-touch-icon')).toBe('warn')
		expect(statusOf(ctx, 'web-manifest')).toBe('info')
		expect(statusOf(ctx, 'theme-color')).toBe('warn')
	})

	it.each([
		['a broken image', image({ ok: false, status: 404, format: undefined }), 'fail'],
		['an SVG', image({ format: 'svg' }), 'fail'],
		['a tiny image', image({ width: 150, height: 150 }), 'fail'],
		['a heavy image', image({ bytes: 6 * 1024 * 1024 }), 'fail'],
		['a small image', image({ width: 500, height: 260 }), 'warn'],
		['a square image', image({ width: 1000, height: 1000 }), 'warn'],
		['a 1200×630 image', image(), 'pass']
	])('rates %s as %s', (_, ogImage, status) => {
		const ctx = contextWithAssets(GOOD_PAGE, { ...GOOD_ASSETS, ogImage })
		expect(statusOf(ctx, 'og-image')).toBe(status)
	})

	it('warns about a large X card without an image X can show', () => {
		const ctx = contextWithAssets(GOOD_PAGE, {
			...GOOD_ASSETS,
			ogImage: image({ width: 250, height: 120 })
		})
		expect(statusOf(ctx, 'twitter-card')).toBe('warn')
	})

	it.each([
		[
			'only a 16×16 favicon',
			[icon('favicon', { format: 'ico', width: 16, height: 16 })],
			'warn'
		],
		['a broken favicon', [icon('favicon', { ok: false, status: 404 })], 'warn'],
		['a 48×48 favicon', [icon('favicon', { width: 48, height: 48 })], 'pass'],
		['an SVG favicon', [icon('favicon', { format: 'svg' })], 'pass']
	])('rates %s as %s', (_, icons, status) => {
		const ctx = contextWithAssets(GOOD_PAGE, { ...GOOD_ASSETS, icons })
		expect(statusOf(ctx, 'favicon')).toBe(status)
	})

	it('wants a 180×180 apple-touch-icon', () => {
		const ctx = contextWithAssets(GOOD_PAGE, {
			...GOOD_ASSETS,
			icons: [icon('apple-touch-icon', { width: 57, height: 57 })]
		})
		expect(statusOf(ctx, 'apple-touch-icon')).toBe('warn')
	})

	it('wants 192 and 512 icons in the manifest', () => {
		const ctx = contextWithAssets(GOOD_PAGE, {
			...GOOD_ASSETS,
			manifest: {
				url: 'https://shop.example.com/m.json',
				ok: true,
				name: 'Shop',
				iconSizes: []
			}
		})
		const result = find(usabilityChecks(ctx), 'web-manifest')
		expect(result.status).toBe('warn')
		expect(result.summary).toMatch(/192×192/)
	})
})

describe('broken links', () => {
	it('fails on a broken internal link', () => {
		const ctx = contextFor(GOOD_PAGE, {
			linkChecks: [{ url: `${URL_}gone`, status: 404, state: 'broken', internal: true }],
			linksDiscovered: 1
		})
		expect(find(linkChecks(ctx), 'broken-links').status).toBe('fail')
	})

	it("doesn't count sites that refuse our check as broken", () => {
		const ctx = contextFor(GOOD_PAGE, {
			linkChecks: [
				{ url: 'https://linkedin.com/x', status: 999, state: 'blocked', internal: false }
			],
			linksDiscovered: 1
		})
		expect(find(linkChecks(ctx), 'broken-links').status).toBe('pass')
	})
})
