import type { MetaGroup, MetaTag } from '@shared/types'
import type { CheerioRoot } from './context'
import { resolveUrl } from './url'

export interface IconLink {
	rel: string
	href: string
	sizes?: string
	type?: string
	color?: string
}

/** The tags that decide how a link to the page looks when it's shared. */
export interface SocialMeta {
	/** The first value of each og:, fb: and article: property. */
	og: Record<string, string>
	/** The first value of each twitter: tag. */
	twitter: Record<string, string>
	/** og:image as written, before resolving it against the page. */
	ogImageRaw?: string
	ogImage?: string
	twitterImage?: string
	themeColor?: string
	/** The site's name from WebSite or Organization structured data. */
	schemaName?: string
	iconLinks: IconLink[]
	manifestUrl?: string
	tags: MetaTag[]
}

const BASIC_TAGS = new Set(['description', 'robots', 'author', 'application-name'])
const APP_TAGS = new Set([
	'theme-color',
	'apple-mobile-web-app-title',
	'apple-mobile-web-app-capable',
	'apple-mobile-web-app-status-bar-style',
	'msapplication-tilecolor',
	'msapplication-tileimage',
	'color-scheme'
])

function groupFor(key: string): MetaGroup | null {
	if (/^(og|fb|article|profile|book|product):/.test(key)) return 'Open Graph'
	if (key.startsWith('twitter:')) return 'X'
	if (BASIC_TAGS.has(key)) return 'Basics'
	if (APP_TAGS.has(key)) return 'Icons and app'

	return null
}

/** "icon", "shortcut icon", "apple-touch-icon(-precomposed)" or "mask-icon", but not "fluid-icon". */
function isIconRel(rel: string): boolean {
	return rel
		.split(/\s+/)
		.some(
			(token) =>
				token === 'icon' || token === 'mask-icon' || token.startsWith('apple-touch-icon')
		)
}

function schemaName(items: unknown[]): string | undefined {
	const queue = [...items]
	while (queue.length) {
		const node = queue.shift()
		if (!node || typeof node !== 'object') continue
		if (Array.isArray(node)) {
			queue.push(...node)
			continue
		}
		const obj = node as Record<string, unknown>
		const type = String(obj['@type'] ?? '')
		if (/WebSite|Organization/.test(type) && typeof obj.name === 'string' && obj.name.trim()) {
			return obj.name.trim()
		}
		if (Array.isArray(obj['@graph'])) queue.push(...obj['@graph'])
	}

	return undefined
}

/** Reads Open Graph, X, icon and app tags. Pure: it makes no requests. */
export function readSocialMeta($: CheerioRoot, base: URL, jsonLdItems: unknown[]): SocialMeta {
	const og: Record<string, string> = {}
	const twitter: Record<string, string> = {}
	const tags: MetaTag[] = []
	let themeColor: string | undefined

	$('meta').each((_, el) => {
		const $el = $(el)
		const key = ($el.attr('property') || $el.attr('name') || '').trim().toLowerCase()
		const value = ($el.attr('content') || '').trim()
		const group = groupFor(key)
		if (!group || !value) return
		tags.push({ group, key, value })
		if (group === 'Open Graph' && !(key in og)) og[key] = value
		if (group === 'X' && !(key in twitter)) twitter[key] = value
		// A theme color without a media query applies everywhere; prefer it.
		if (key === 'theme-color' && (!themeColor || !$el.attr('media'))) themeColor = value
	})

	const iconLinks: IconLink[] = []
	let manifestUrl: string | undefined
	$('link[rel][href]').each((_, el) => {
		const $el = $(el)
		const rel = ($el.attr('rel') || '').toLowerCase().trim()
		const href = resolveUrl($el.attr('href'), base)
		if (!href) return
		if (rel === 'manifest') {
			manifestUrl ??= href
			tags.push({ group: 'Icons and app', key: 'manifest', value: href })

			return
		}
		if (!isIconRel(rel)) return
		const sizes = $el.attr('sizes')
		iconLinks.push({ rel, href, sizes, type: $el.attr('type'), color: $el.attr('color') })
		tags.push({
			group: 'Icons and app',
			key: `${rel}${sizes ? ` (${sizes})` : ''}`,
			value: href
		})
	})

	const title = $('head title').first().text().replace(/\s+/g, ' ').trim()
	if (title) tags.unshift({ group: 'Basics', key: 'title', value: title })
	const canonical = $('link[rel="canonical" i]').attr('href')
	if (canonical) tags.push({ group: 'Basics', key: 'canonical', value: canonical })

	return {
		og,
		twitter,
		ogImageRaw: og['og:image'] || og['og:image:url'] || og['og:image:secure_url'],
		ogImage:
			resolveUrl(og['og:image'] || og['og:image:url'] || og['og:image:secure_url'], base) ??
			undefined,
		twitterImage:
			resolveUrl(twitter['twitter:image'] || twitter['twitter:image:src'], base) ?? undefined,
		themeColor,
		schemaName: schemaName(jsonLdItems),
		iconLinks,
		manifestUrl,
		tags
	}
}
