import type {
	IconAsset,
	IconKind,
	ImageAsset,
	SharePreviewResult,
	SharingReport,
	WebManifest
} from '@shared/types'
import type { ParsedPage } from './context'
import { fetchPage } from './fetch-page'
import { mapLimit, normalizeInputUrl, safeFetch } from './http'
import { imageSize } from './image-size'
import { parsePage } from './parse'
import { buildPreviews } from './previews'
import { resolveUrl } from './url'

const SHARE_IMAGE_MAX_BYTES = 10 * 1024 * 1024
const ICON_MAX_BYTES = 1024 * 1024
/** Icons measured per page; sites with dozens of sizes only need a sample. */
const MAX_ICONS = 14
const MAX_MANIFEST_ICONS = 4
const KIND_ORDER: IconKind[] = ['favicon', 'apple-touch-icon', 'manifest', 'mask-icon']

interface IconCandidate {
	url: string
	kind: IconKind
	source: string
	declaredSizes?: string
	purpose?: string
	/** A guess at a conventional location; only kept when it exists. */
	optional?: boolean
}

/** Downloads an image and reads its format, size and weight. */
export async function probeImage(url: string, maxBytes: number): Promise<ImageAsset> {
	try {
		const res = await safeFetch(url, {
			timeoutMs: 10_000,
			maxBytes,
			headers: { accept: 'image/avif,image/webp,image/*,*/*;q=0.8' }
		})
		const length = Number(res.headers.get('content-length') || 0)
		const size = res.status < 400 ? imageSize(res.body) : null
		const error =
			res.status >= 400
				? `HTTP ${res.status}`
				: size
					? undefined
					: "Isn't an image we can read"

		return {
			url,
			status: res.status,
			ok: res.status < 400 && Boolean(size),
			contentType: res.contentType.split(';')[0] || undefined,
			format: size?.format,
			width: size?.width,
			height: size?.height,
			sizes: size?.sizes,
			bytes: res.truncated ? Math.max(length, res.bytes) : res.bytes,
			error
		}
	} catch (e) {
		return { url, status: null, ok: false, error: (e as Error).message }
	}
}

/** The largest edge in a sizes attribute like "16x16 32x32"; "any" counts as huge. */
function largestEdge(sizes: string | undefined): number {
	if (!sizes) return 0
	if (/\bany\b/i.test(sizes)) return Infinity

	return Math.max(0, ...sizes.split(/\s+/).map((size) => Number(size.split(/x/i)[0]) || 0))
}

function iconKind(rel: string): IconKind {
	if (rel.includes('apple-touch-icon')) return 'apple-touch-icon'
	if (rel.includes('mask-icon')) return 'mask-icon'

	return 'favicon'
}

async function readManifest(
	url: string
): Promise<{ manifest: WebManifest; icons: IconCandidate[] }> {
	try {
		const res = await safeFetch(url, {
			timeoutMs: 8000,
			maxBytes: 256 * 1024,
			headers: { accept: 'application/manifest+json,application/json,*/*' }
		})
		if (res.status >= 400) {
			return {
				manifest: { url, ok: false, error: `HTTP ${res.status}`, iconSizes: [] },
				icons: []
			}
		}
		const data = JSON.parse(res.body.toString('utf8')) as Record<string, unknown>
		const list = Array.isArray(data.icons) ? (data.icons as Record<string, unknown>[]) : []
		const base = new URL(res.url)
		const icons: IconCandidate[] = list
			.map((icon) => ({
				url: resolveUrl(String(icon.src ?? ''), base) ?? '',
				kind: 'manifest' as const,
				source: 'Web app manifest',
				declaredSizes: typeof icon.sizes === 'string' ? icon.sizes : undefined,
				purpose: typeof icon.purpose === 'string' ? icon.purpose : undefined
			}))
			.filter((icon) => icon.url)
		const text = (value: unknown) =>
			typeof value === 'string' && value.trim() ? value.trim() : undefined

		return {
			manifest: {
				url,
				ok: true,
				name: text(data.name),
				shortName: text(data.short_name),
				themeColor: text(data.theme_color),
				backgroundColor: text(data.background_color),
				display: text(data.display),
				iconSizes: [
					...new Set(icons.flatMap((icon) => icon.declaredSizes?.split(/\s+/) ?? []))
				]
					.filter(Boolean)
					.sort((a, b) => largestEdge(a) - largestEdge(b))
			},
			// The big ones matter most: Android installs use 192×192 and 512×512.
			icons: [...icons]
				.sort((a, b) => largestEdge(b.declaredSizes) - largestEdge(a.declaredSizes))
				.slice(0, MAX_MANIFEST_ICONS)
		}
	} catch (e) {
		const message = e instanceof SyntaxError ? "It isn't valid JSON." : (e as Error).message

		return { manifest: { url, ok: false, error: message, iconSizes: [] }, icons: [] }
	}
}

function iconCandidates(page: ParsedPage, manifestIcons: IconCandidate[]): IconCandidate[] {
	const { social, finalUrl } = page
	const fromLinks: IconCandidate[] = social.iconLinks.map((link) => ({
		url: link.href,
		kind: iconKind(link.rel),
		source: `<link rel="${link.rel}">`,
		declaredSizes: link.sizes
	}))
	const defaults: IconCandidate[] = [
		{
			url: `${finalUrl.origin}/favicon.ico`,
			kind: 'favicon',
			source: 'Default /favicon.ico',
			optional: true
		}
	]
	if (!fromLinks.some((icon) => icon.kind === 'apple-touch-icon')) {
		defaults.push({
			url: `${finalUrl.origin}/apple-touch-icon.png`,
			kind: 'apple-touch-icon',
			source: 'Default /apple-touch-icon.png',
			optional: true
		})
	}
	const seen = new Set<string>()

	return [...fromLinks, ...manifestIcons, ...defaults]
		.filter((icon) => {
			if (seen.has(icon.url)) return false
			seen.add(icon.url)

			return true
		})
		.slice(0, MAX_ICONS)
}

/** Downloads the share images, icons and web manifest, then works out each platform's preview. */
export async function gatherSharing(page: ParsedPage): Promise<SharingReport> {
	const { social } = page
	const twitterIsSame = !social.twitterImage || social.twitterImage === social.ogImage
	const [ogImage, twitterImage, manifestResult] = await Promise.all([
		social.ogImage ? probeImage(social.ogImage, SHARE_IMAGE_MAX_BYTES) : undefined,
		twitterIsSame ? undefined : probeImage(social.twitterImage!, SHARE_IMAGE_MAX_BYTES),
		social.manifestUrl ? readManifest(social.manifestUrl) : undefined
	])
	const candidates = iconCandidates(page, manifestResult?.icons ?? [])
	const probed = await mapLimit(candidates, 6, async (candidate) => {
		const { optional, ...rest } = candidate
		const asset = await probeImage(candidate.url, ICON_MAX_BYTES)

		return optional && !asset.ok ? null : { ...rest, ...asset }
	})
	const icons = probed
		.filter((icon): icon is IconAsset => icon !== null)
		.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
	const sharedTwitterImage = social.twitterImage
		? twitterIsSame
			? ogImage
			: twitterImage
		: undefined

	return {
		previews: buildPreviews({
			meta: social,
			title: page.title,
			description: page.description,
			text: page.text,
			finalUrl: page.finalUrl,
			ogImage,
			twitterImage: sharedTwitterImage,
			icons
		}),
		icons,
		ogImage,
		twitterImage: sharedTwitterImage,
		manifest: manifestResult?.manifest,
		themeColor: social.themeColor,
		tags: social.tags
	}
}

/** Just the share previews and icons for a URL, without a full audit. Takes a few seconds. */
export async function runSharePreview(input: string): Promise<SharePreviewResult> {
	const explicitScheme = /^https?:\/\//i.test(input.trim())
	const url = normalizeInputUrl(input)
	const page = parsePage(await fetchPage(url, explicitScheme))

	return {
		url,
		finalUrl: page.finalUrl.toString(),
		title: page.title,
		checkedAt: new Date().toISOString(),
		sharing: await gatherSharing(page)
	}
}
