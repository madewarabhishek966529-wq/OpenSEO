import * as cheerio from 'cheerio'
import type { CheerioRoot, ImageInfo, LinkInfo, ParsedPage } from './context'
import { decodeHtml, stripWww, type SafeFetchResult } from './http'
import { readSocialMeta } from './social-meta'
import { detectTechnologies } from './tech'
import { resolveUrl } from './url'

function collectSchemaTypes(node: unknown, out: Set<string>): void {
	if (!node || typeof node !== 'object') return
	if (Array.isArray(node)) {
		node.forEach((n) => collectSchemaTypes(n, out))

		return
	}
	const obj = node as Record<string, unknown>
	const type = obj['@type']
	if (typeof type === 'string') out.add(type)
	else if (Array.isArray(type)) type.forEach((t) => typeof t === 'string' && out.add(t))
	for (const [key, value] of Object.entries(obj)) {
		if (key !== '@context' && value && typeof value === 'object') collectSchemaTypes(value, out)
	}
}

/** The words a visitor can read, without scripts, styles and other hidden markup. */
export function extractText($: CheerioRoot): string {
	const body = $('body').clone()
	body.find('script, style, noscript, template, svg, iframe, canvas, object').remove()

	return body.text().replace(/\s+/g, ' ').trim()
}

export function countWords(text: string): number {
	return (text.match(/[\p{L}\p{N}]+/gu) || []).length
}

function collapse(text: string): string {
	return text.replace(/\s+/g, ' ').trim()
}

function readLinks($: CheerioRoot, base: URL, host: string) {
	const links: LinkInfo[] = []
	const mailtoLinks: string[] = []
	$('a[href]').each((_, el) => {
		const $el = $(el)
		const raw = ($el.attr('href') || '').trim()
		if (raw.toLowerCase().startsWith('mailto:')) {
			mailtoLinks.push(raw.slice(7).split('?')[0])

			return
		}
		if (!raw || raw.startsWith('#') || /^(javascript|tel|sms|data):/i.test(raw)) return
		const href = resolveUrl(raw, base)
		if (!href) return
		const rel = ($el.attr('rel') || '').toLowerCase()
		const text = collapse($el.text())
		const imageAlt = $el
			.find('img[alt]')
			.map((_, img) => $(img).attr('alt'))
			.get()
			.join(' ')
			.trim()
		links.push({
			href,
			text,
			rel,
			internal: stripWww(new URL(href).hostname) === host,
			nofollow: /\b(nofollow|ugc|sponsored)\b/.test(rel),
			hasImage: $el.find('img, svg').length > 0,
			label:
				text ||
				($el.attr('aria-label') || '').trim() ||
				($el.attr('title') || '').trim() ||
				imageAlt
		})
	})

	return { links, mailtoLinks }
}

function readImages($: CheerioRoot, base: URL): ImageInfo[] {
	const images: ImageInfo[] = []
	$('img').each((_, el) => {
		const $el = $(el)
		const src = resolveUrl($el.attr('src') || $el.attr('data-src'), base)
		if (!src) return
		images.push({
			src,
			alt: $el.attr('alt') ?? null,
			width: $el.attr('width'),
			height: $el.attr('height'),
			loading: $el.attr('loading')
		})
	})

	return images
}

function readStructuredData($: CheerioRoot) {
	const types = new Set<string>()
	const items: unknown[] = []
	let errors = 0
	$('script[type="application/ld+json"]').each((_, el) => {
		const raw = $(el).contents().text().trim()
		if (!raw) return
		try {
			const data = JSON.parse(raw)
			items.push(data)
			collectSchemaTypes(data, types)
		} catch {
			errors++
		}
	})
	const microdataTypes = [
		...new Set(
			$('[itemtype]')
				.map((_, el) => ($(el).attr('itemtype') || '').split('/').pop() || '')
				.get()
				.filter(Boolean)
		)
	]

	return { jsonLd: { types: [...types], errors, items }, microdataTypes }
}

/** Parses the fetched document and pulls out everything the checks need. */
export function parsePage(page: SafeFetchResult): ParsedPage {
	const html = decodeHtml(page.body, page.contentType)
	const $ = cheerio.load(html)
	const finalUrl = new URL(page.url)
	const baseHref = resolveUrl($('base[href]').attr('href'), finalUrl)
	const base = baseHref ? new URL(baseHref) : finalUrl
	const text = extractText($)
	const generator = $('meta[name="generator" i]').attr('content') || ''
	const structured = readStructuredData($)

	return {
		html,
		$,
		finalUrl,
		text,
		wordCount: countWords(text),
		title: collapse($('head title').first().text() || $('title').first().text()),
		description: collapse($('meta[name="description" i]').attr('content') || ''),
		generator,
		...readLinks($, base, stripWww(finalUrl.hostname)),
		images: readImages($, base),
		...structured,
		social: readSocialMeta($, base, structured.jsonLd.items),
		tech: detectTechnologies(html, page.headers, generator)
	}
}
