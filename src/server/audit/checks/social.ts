import type { AuditContext } from '@server/audit/context'
import { formatBytes, formatCount } from '@shared/format'
import type { CheckResult, Detail } from '@shared/types'
import { inCategory, listDetail } from './check'

const check = inCategory('social')

const NETWORKS: [string, RegExp][] = [
	['Facebook', /(^|\.)facebook\.com$/],
	['Instagram', /(^|\.)instagram\.com$/],
	['X (Twitter)', /(^|\.)(twitter|x)\.com$/],
	['LinkedIn', /(^|\.)linkedin\.com$/],
	['YouTube', /(^|\.)youtube\.com$/],
	['TikTok', /(^|\.)tiktok\.com$/],
	['Pinterest', /(^|\.)pinterest\.[a-z.]+$/],
	['GitHub', /(^|\.)github\.com$/],
	['Threads', /(^|\.)threads\.(net|com)$/],
	['Bluesky', /(^|\.)bsky\.app$/],
	['Mastodon', /(^|\.)mastodon\.social$/],
	['Discord', /(^|\.)discord\.(gg|com)$/]
]

const MB = 1024 * 1024
const CARD_TYPES = ['summary', 'summary_large_image', 'app', 'player']

function imageFacts(ctx: AuditContext): Detail {
	const image = ctx.sharing.ogImage
	const { og } = ctx.social
	const items: [string, string][] = [['og:image', ctx.social.ogImageRaw ?? 'Missing']]
	if (image) {
		items.push(
			['Loads', image.ok ? 'Yes' : `No${image.error ? ` (${image.error})` : ''}`],
			['Size', image.width && image.height ? `${image.width}×${image.height}` : 'Unknown'],
			['Format', image.format?.toUpperCase() ?? image.contentType ?? 'Unknown'],
			['File size', image.bytes ? formatBytes(image.bytes) : 'Unknown']
		)
	}
	items.push(
		['og:image:alt', og['og:image:alt'] || 'Missing'],
		[
			'Declared size',
			og['og:image:width'] && og['og:image:height']
				? `${og['og:image:width']}×${og['og:image:height']}`
				: 'Not declared'
		]
	)

	return { kind: 'kv', items }
}

function openGraphCheck(ctx: AuditContext): CheckResult {
	const { og } = ctx.social
	const tags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name']
	const details: Detail[] = [{ kind: 'kv', items: tags.map((t) => [t, og[t] || 'Missing']) }]
	const core = ['og:title', 'og:description', 'og:image']
	const present = core.filter((t) => og[t])
	const optionalMissing = ['og:url', 'og:type', 'og:site_name'].filter((t) => !og[t])
	const base = {
		id: 'open-graph',
		title: 'Open Graph tags',
		weight: 2,
		priority: 'medium' as const
	}
	if (!present.length) {
		return check({
			...base,
			status: 'fail',
			summary: 'The page has no Open Graph tags, so shared links look bare.',
			recommendation:
				'Add og:title, og:description and og:image so links shared on Facebook, LinkedIn, Slack, WhatsApp and iMessage show a proper card.',
			details
		})
	}
	if (present.length < core.length) {
		return check({
			...base,
			status: 'warn',
			summary: `Some Open Graph tags are missing: ${core.filter((t) => !og[t]).join(', ')}.`,
			recommendation:
				'Fill in og:title, og:description and og:image. Platforms fall back to other tags, but not always well.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: optionalMissing.length
			? `Title, description and image are set; ${optionalMissing.join(', ')} ${optionalMissing.length === 1 ? 'is' : 'are'} missing.`
			: 'Every main Open Graph tag is set.',
		details
	})
}

function ogImageCheck(ctx: AuditContext): CheckResult {
	const { social, sharing } = ctx
	const image = sharing.ogImage ?? sharing.twitterImage
	const base = { id: 'og-image', title: 'Share image', weight: 2, priority: 'medium' as const }
	const details = [imageFacts(ctx)]
	const relative = social.ogImageRaw && !/^https?:\/\//i.test(social.ogImageRaw)
	if (!image) {
		return check({
			...base,
			status: 'fail',
			summary: 'There is no share image, so links show without a picture on most platforms.',
			recommendation:
				'Add <meta property="og:image" content="https://…"> with a 1200×630 JPEG or PNG under 1 MB. Make one per page if you can.',
			details
		})
	}
	if (!image.ok || image.format === 'svg') {
		return check({
			...base,
			status: 'fail',
			summary:
				image.format === 'svg'
					? "The share image is an SVG, which social platforms don't show."
					: `The share image doesn't load (${image.error ?? 'unknown error'}).`,
			recommendation: 'Point og:image at a public JPEG or PNG that loads without a login.',
			details
		})
	}
	const { width = 0, height = 0 } = image
	const sizeText = width && height ? `${width}×${height}` : 'an unknown size'
	if ((image.bytes ?? 0) > 5 * MB) {
		return check({
			...base,
			status: 'fail',
			summary: `The share image is ${formatBytes(image.bytes ?? 0)}; X won't show images over 5 MB and Facebook's limit is 8 MB.`,
			recommendation:
				'Compress it to well under 1 MB. 1200×630 JPEGs are usually 100–300 KB.',
			details
		})
	}
	if (width && height && (width < 200 || height < 200)) {
		return check({
			...base,
			status: 'fail',
			summary: `The share image is only ${sizeText}, too small for most platforms.`,
			recommendation: 'Use a 1200×630 image.',
			details
		})
	}
	const problems = [
		width &&
			height &&
			(width < 600 || height < 315) &&
			'it shows as a small thumbnail on Facebook and Slack',
		width &&
			height &&
			(width / height < 1.5 || width / height > 2.2) &&
			'its shape will be cropped to about 1.91:1',
		relative && "og:image isn't a full URL, which some platforms ignore"
	].filter(Boolean)
	if (problems.length) {
		return check({
			...base,
			status: 'warn',
			summary: `The share image is ${sizeText}: ${problems.join('; ')}.`,
			recommendation: 'Use a 1200×630 image (1.91:1) and an absolute https:// URL.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary:
			width >= 1200 && height >= 630
				? `The share image is ${sizeText}, sharp on every platform.`
				: `The share image is ${sizeText}; 1200×630 would look sharper on high-resolution screens.`,
		details
	})
}

function twitterCardCheck(ctx: AuditContext): CheckResult {
	const card = ctx.social.twitter['twitter:card']
	const x = ctx.sharing.previews.find((p) => p.platform === 'x')
	const base = {
		id: 'twitter-card',
		title: 'X (Twitter) card',
		weight: 1,
		priority: 'low' as const
	}
	const details: Detail[] = [
		{
			kind: 'kv',
			items: [
				'twitter:card',
				'twitter:title',
				'twitter:description',
				'twitter:image',
				'twitter:site'
			].map((key) => [key, ctx.social.twitter[key] || 'Not set (falls back to Open Graph)'])
		}
	]
	if (!card) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page has no twitter:card tag, so X shows a small card.',
			recommendation:
				'Add <meta name="twitter:card" content="summary_large_image">. X reads the title and image from Open Graph if the twitter: ones are missing.',
			details
		})
	}
	if (!CARD_TYPES.includes(card)) {
		return check({
			...base,
			status: 'warn',
			summary: `"${card}" isn't a card type X knows.`,
			recommendation: 'Use summary_large_image (or summary for a small square image).',
			details
		})
	}
	if (card === 'summary_large_image' && x?.layout === 'none') {
		return check({
			...base,
			status: 'warn',
			summary: "The card asks for a large image, but there isn't one X can show.",
			recommendation:
				'Set og:image or twitter:image to an image of at least 300×157 (ideally 1200×630).',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page uses a "${card}" card on X.`,
		details
	})
}

function profilesCheck(ctx: AuditContext): CheckResult {
	const found = new Map<string, string>()
	const sameAs = JSON.stringify(ctx.jsonLd.items).match(/https?:\/\/[^"\\]+/g) || []
	for (const href of [...ctx.links.filter((l) => !l.internal).map((l) => l.href), ...sameAs]) {
		try {
			const host = new URL(href).hostname
			const network = NETWORKS.find(([, pattern]) => pattern.test(host))
			if (network && !found.has(network[0])) found.set(network[0], href)
		} catch {
			// not a URL
		}
	}
	const base = {
		id: 'social-profiles',
		title: 'Social profiles',
		weight: 1,
		priority: 'low' as const
	}
	if (!found.size) {
		return check({
			...base,
			status: 'warn',
			summary: "The page doesn't link to any social profiles.",
			recommendation:
				'Link to your social profiles (usually in the footer) and list them as sameAs in your Organization schema.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page links to ${formatCount(found.size, 'social profile')}.`,
		details: [listDetail([...found.entries()].map(([name, href]) => `${name}: ${href}`))]
	})
}

function pixelsCheck(ctx: AuditContext): CheckResult {
	const pixels = ctx.tech.filter((t) => t.category === 'Advertising')

	return check({
		id: 'ad-pixels',
		title: 'Ad pixels',
		status: 'info',
		weight: 0,
		priority: 'low',
		summary: pixels.length
			? `The page loads ${pixels.map((p) => p.name).join(', ')}.`
			: 'No advertising pixels found. Add one if you run social or search ads and want to measure them.'
	})
}

export function socialChecks(ctx: AuditContext): CheckResult[] {
	return [
		openGraphCheck(ctx),
		ogImageCheck(ctx),
		twitterCardCheck(ctx),
		profilesCheck(ctx),
		pixelsCheck(ctx)
	]
}
