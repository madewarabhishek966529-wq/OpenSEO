import { breadcrumbUrl, formatBytes, truncate } from '@shared/format'
import type { IconAsset, ImageAsset, PreviewNote, SharePreview } from '@shared/types'
import { stripWww } from './http'
import type { SocialMeta } from './social-meta'

export interface PreviewInput {
	meta: SocialMeta
	title: string
	description: string
	/** The page's text, for the snippet Google shows when there's no description. */
	text: string
	finalUrl: URL
	ogImage?: ImageAsset
	twitterImage?: ImageAsset
	icons: IconAsset[]
}

/** What every platform shows the same way. */
interface Shared {
	domain: string
	siteName: string
	ogTitle: string
	ogDescription?: string
}

const MB = 1024 * 1024

/** Platforms can show it: it loaded, we could read it, and it isn't an SVG. */
function usable(image: ImageAsset | undefined): image is ImageAsset {
	return Boolean(image?.ok && image.format !== 'svg')
}

function size(image: ImageAsset): string {
	return image.width && image.height ? `${image.width}×${image.height}` : 'of unknown size'
}

function smallerThan(image: ImageAsset, width: number, height: number): boolean {
	return Boolean(image.width && image.height && (image.width < width || image.height < height))
}

function brokenNote(image: ImageAsset): PreviewNote {
	if (image.format === 'svg') return { tone: 'fail', text: "SVG share images aren't supported." }

	return {
		tone: 'fail',
		text: `The share image doesn't load${image.status ? ` (HTTP ${image.status})` : ''}.`
	}
}

function done(notes: PreviewNote[]): PreviewNote[] {
	return notes.length ? notes : [{ tone: 'pass', text: 'Looks good.' }]
}

/** The favicon a platform would pick: SVG first, then the largest one that loads. */
export function bestFavicon(icons: IconAsset[]): IconAsset | undefined {
	const favicons = icons.filter((i) => i.ok && i.kind === 'favicon')

	return (
		favicons.find((i) => i.format === 'svg') ??
		[...favicons].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0] ??
		icons.find((i) => i.ok && i.kind === 'apple-touch-icon')
	)
}

function appleIcon(icons: IconAsset[]): IconAsset | undefined {
	return icons.find((i) => i.ok && i.kind === 'apple-touch-icon')
}

function google(input: PreviewInput, shared: Shared): SharePreview {
	const { title, description, text, icons } = input
	const notes: PreviewNote[] = []
	if (!title) notes.push({ tone: 'warn', text: 'No <title>, so Google writes its own.' })
	else if (title.length > 60) {
		notes.push({
			tone: 'warn',
			text: `The title is ${title.length} characters; Google cuts it at about 60.`
		})
	}
	if (!description) {
		notes.push({
			tone: 'warn',
			text: 'No meta description, so Google picks text from the page.'
		})
	} else if (description.length > 160) {
		notes.push({
			tone: 'info',
			text: `The description is ${description.length} characters; Google shows about 160.`
		})
	}
	const favicon = bestFavicon(icons)
	if (!favicon) notes.push({ tone: 'warn', text: 'No favicon, so Google shows a generic globe.' })
	else if (favicon.format !== 'svg' && Math.min(favicon.width ?? 0, favicon.height ?? 0) < 48) {
		notes.push({
			tone: 'warn',
			text: 'Google recommends a square favicon of at least 48×48 px.'
		})
	}

	return {
		domain: shared.domain,
		siteName: shared.siteName,
		platform: 'google',
		name: 'Google',
		title: truncate(title || shared.domain, 65),
		description: truncate(description || truncate(text, 160), 160),
		displayUrl: breadcrumbUrl(input.finalUrl.toString()),
		layout: 'none',
		icon: favicon?.url,
		notes: done(notes)
	}
}

function facebook(input: PreviewInput, shared: Shared): SharePreview {
	const { meta, ogImage } = input
	const notes: PreviewNote[] = []
	let layout: SharePreview['layout'] = 'none'
	if (!meta.ogImage) {
		notes.push({
			tone: 'fail',
			text: 'No og:image, so Facebook shows the link without a picture.'
		})
	} else if (!usable(ogImage)) {
		notes.push(brokenNote(ogImage ?? { url: meta.ogImage, status: null, ok: false }))
	} else if ((ogImage.bytes ?? 0) > 8 * MB) {
		notes.push({ tone: 'fail', text: "The image is over 8 MB, so Facebook won't use it." })
	} else if (smallerThan(ogImage, 600, 315)) {
		layout = 'small'
		notes.push({
			tone: 'warn',
			text: `The image is ${size(ogImage)}; under 600×315 it shows as a small thumbnail.`
		})
	} else {
		layout = 'large'
	}
	if (!meta.og['og:title']) {
		notes.push({ tone: 'info', text: 'No og:title, so Facebook uses the <title>.' })
	}

	return {
		domain: shared.domain,
		siteName: shared.siteName,
		platform: 'facebook',
		name: 'Facebook',
		title: shared.ogTitle,
		description: shared.ogDescription,
		displayUrl: shared.domain,
		image: layout === 'none' ? undefined : ogImage?.url,
		layout,
		notes: done(notes)
	}
}

function x(input: PreviewInput, shared: Shared): SharePreview {
	const { meta } = input
	const card = meta.twitter['twitter:card']
	const image = meta.twitterImage ? input.twitterImage : input.ogImage
	const notes: PreviewNote[] = []
	let layout: SharePreview['layout'] = 'none'
	if (!card) {
		notes.push({
			tone: 'warn',
			text: 'No twitter:card, so X shows a small card. Use summary_large_image for a big one.'
		})
	} else if (card === 'summary') {
		notes.push({
			tone: 'info',
			text: 'twitter:card is "summary", so X shows a small square image.'
		})
	}
	if (!meta.twitterImage && !meta.ogImage) {
		notes.push({
			tone: 'fail',
			text: 'No twitter:image or og:image, so the card has no picture.'
		})
	} else if (!usable(image)) {
		notes.push(brokenNote(image ?? { url: '', status: null, ok: false }))
	} else if ((image.bytes ?? 0) > 5 * MB) {
		notes.push({ tone: 'fail', text: "The image is over 5 MB, so X won't show it." })
	} else if (card === 'summary_large_image') {
		layout = smallerThan(image, 300, 157) ? 'none' : 'large'
	} else {
		layout = smallerThan(image, 144, 144) ? 'none' : 'small'
	}
	if (usable(image) && layout === 'none' && (image.bytes ?? 0) <= 5 * MB) {
		notes.push({ tone: 'warn', text: `The image is ${size(image)}, too small for this card.` })
	}

	return {
		domain: shared.domain,
		siteName: shared.siteName,
		platform: 'x',
		name: 'X',
		title: meta.twitter['twitter:title'] || shared.ogTitle,
		description: undefined,
		displayUrl: shared.domain,
		image: layout === 'none' ? undefined : image?.url,
		layout,
		notes: done(notes)
	}
}

function linkedin(input: PreviewInput, shared: Shared): SharePreview {
	const { meta, ogImage } = input
	const notes: PreviewNote[] = []
	let layout: SharePreview['layout'] = 'none'
	if (!meta.ogImage) {
		notes.push({ tone: 'fail', text: 'No og:image, so LinkedIn shows a text-only link.' })
	} else if (!usable(ogImage)) {
		notes.push(brokenNote(ogImage ?? { url: meta.ogImage, status: null, ok: false }))
	} else if (ogImage.width && ogImage.width < 200) {
		notes.push({ tone: 'warn', text: "Images under 200 px wide aren't shown." })
	} else if (ogImage.width && ogImage.width < 401) {
		layout = 'small'
		notes.push({
			tone: 'warn',
			text: 'Under 401 px wide, the image shows as a small thumbnail.'
		})
	} else {
		layout = 'large'
		if (smallerThan(ogImage, 1200, 627)) {
			notes.push({
				tone: 'info',
				text: `The image is ${size(ogImage)}; LinkedIn recommends 1200×627.`
			})
		}
	}
	if (!meta.og['og:title']) {
		notes.push({ tone: 'info', text: 'No og:title, so LinkedIn uses the <title>.' })
	}

	return {
		domain: shared.domain,
		siteName: shared.siteName,
		platform: 'linkedin',
		name: 'LinkedIn',
		title: shared.ogTitle,
		description: undefined,
		displayUrl: shared.domain,
		image: layout === 'none' ? undefined : ogImage?.url,
		layout,
		notes: done(notes)
	}
}

/** Slack and Discord unfurl the same way: a large image only for summary_large_image. */
function unfurlLayout(input: PreviewInput): { image?: ImageAsset; layout: SharePreview['layout'] } {
	const image = usable(input.ogImage)
		? input.ogImage
		: usable(input.twitterImage)
			? input.twitterImage
			: undefined
	if (!image) return { layout: 'none' }

	return {
		image,
		layout: input.meta.twitter['twitter:card'] === 'summary_large_image' ? 'large' : 'small'
	}
}

function slack(input: PreviewInput, shared: Shared): SharePreview {
	const { meta, icons } = input
	const { image, layout } = unfurlLayout(input)
	const favicon = bestFavicon(icons)
	const notes: PreviewNote[] = []
	if (!image) notes.push({ tone: 'warn', text: 'No share image, so Slack shows text only.' })
	else if (layout === 'small') {
		notes.push({
			tone: 'info',
			text: 'Slack shows a small thumbnail unless twitter:card is summary_large_image.'
		})
	}
	if (!meta.og['og:site_name']) {
		notes.push({
			tone: 'info',
			text: 'No og:site_name, so Slack shows the domain as the site name.'
		})
	}
	if (!favicon) notes.push({ tone: 'info', text: 'No favicon to show next to the site name.' })

	return {
		domain: shared.domain,
		siteName: shared.siteName,
		platform: 'slack',
		name: 'Slack',
		title: shared.ogTitle,
		description: shared.ogDescription,
		displayUrl: shared.domain,
		image: image?.url,
		layout,
		icon: favicon?.url,
		notes: done(notes)
	}
}

function discord(input: PreviewInput, shared: Shared): SharePreview {
	const { meta } = input
	const { image, layout } = unfurlLayout(input)
	const notes: PreviewNote[] = []
	if (!image) notes.push({ tone: 'warn', text: 'No share image, so Discord shows text only.' })
	if (!meta.themeColor) {
		notes.push({
			tone: 'info',
			text: 'Add <meta name="theme-color"> to color the side bar of the embed.'
		})
	}

	return {
		domain: shared.domain,
		// Discord only shows a site name when og:site_name sets one.
		siteName: meta.og['og:site_name'] ?? '',
		platform: 'discord',
		name: 'Discord',
		title: shared.ogTitle,
		description: shared.ogDescription && truncate(shared.ogDescription, 350),
		displayUrl: shared.domain,
		image: image?.url,
		layout,
		accent: meta.themeColor,
		notes: done(notes)
	}
}

function whatsapp(input: PreviewInput, shared: Shared): SharePreview {
	const { meta, ogImage } = input
	const notes: PreviewNote[] = []
	let layout: SharePreview['layout'] = 'none'
	if (!meta.ogImage) {
		notes.push({ tone: 'warn', text: 'No og:image, so WhatsApp shows text only.' })
	} else if (!usable(ogImage)) {
		notes.push(brokenNote(ogImage ?? { url: meta.ogImage, status: null, ok: false }))
	} else {
		const wide =
			(ogImage.width ?? 0) >= 600 && (ogImage.width ?? 0) / (ogImage.height || 1) >= 1.3
		layout = wide ? 'large' : 'small'
		if ((ogImage.bytes ?? 0) > 300 * 1024) {
			notes.push({
				tone: 'warn',
				text: `The image is ${formatBytes(ogImage.bytes ?? 0)}; WhatsApp often skips images over about 300 KB.`
			})
		}
	}

	return {
		domain: shared.domain,
		siteName: shared.siteName,
		platform: 'whatsapp',
		name: 'WhatsApp',
		title: shared.ogTitle,
		description: shared.ogDescription,
		displayUrl: shared.domain,
		image: layout === 'none' ? undefined : ogImage?.url,
		layout,
		notes: done(notes)
	}
}

function telegram(input: PreviewInput, shared: Shared): SharePreview {
	const { meta, ogImage } = input
	const notes: PreviewNote[] = []
	let layout: SharePreview['layout'] = 'none'

	if (!meta.ogImage) {
		notes.push({ tone: 'warn', text: 'No og:image, so Telegram shows text only.' })
	} else if (!usable(ogImage)) {
		notes.push(brokenNote(ogImage ?? { url: meta.ogImage, status: null, ok: false }))
	} else {
		layout = 'large'
	}

	return {
		domain: shared.domain,
		siteName: shared.siteName,
		platform: 'telegram',
		name: 'Telegram',
		title: shared.ogTitle,
		description: shared.ogDescription,
		displayUrl: shared.domain,
		image: layout === 'none' ? undefined : ogImage?.url,
		layout,
		notes: done(notes)
	}
}

function imessage(input: PreviewInput, shared: Shared): SharePreview {
	const { ogImage, icons } = input
	const icon = appleIcon(icons) ?? bestFavicon(icons)
	const hasImage = usable(ogImage)
	const notes: PreviewNote[] = []
	if (!hasImage) {
		notes.push({
			tone: 'warn',
			text: icon
				? 'No share image, so iMessage shows your icon instead.'
				: 'No share image or icon, so iMessage shows a plain link.'
		})
	}
	if (!appleIcon(icons)) {
		notes.push({
			tone: 'info',
			text: 'No apple-touch-icon; iPhones fall back to the favicon or a screenshot.'
		})
	}

	return {
		domain: shared.domain,
		siteName: shared.siteName,
		platform: 'imessage',
		name: 'iMessage',
		title: shared.ogTitle,
		description: undefined,
		displayUrl: shared.domain,
		image: hasImage ? ogImage.url : undefined,
		layout: hasImage ? 'large' : 'none',
		icon: icon?.url,
		notes: done(notes)
	}
}

/** How a link to the page is likely to look on each platform, with what to fix for each. */
export function buildPreviews(input: PreviewInput): SharePreview[] {
	const { meta, title, description, finalUrl } = input
	const domain = stripWww(finalUrl.hostname)
	const shared: Shared = {
		domain,
		siteName: meta.og['og:site_name'] || meta.schemaName || domain,
		ogTitle: meta.og['og:title'] || title || domain,
		ogDescription: meta.og['og:description'] || description || undefined
	}

	return [google, facebook, x, linkedin, slack, discord, whatsapp, telegram, imessage].map(
		(platform) => platform(input, shared)
	)
}
