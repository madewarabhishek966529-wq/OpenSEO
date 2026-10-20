import { formatBytes } from '@shared/format'
import type { ImageAsset, PreviewNote, SharePreview, Status } from '@shared/types'
import { TONE_ORDER } from './share-previews.constants'

/** A preview's overall mark: its worst note, with tips (info) counting as fine. */
export function previewTone(notes: PreviewNote[]): Status {
	const worst = TONE_ORDER.find((tone) => notes.some((note) => note.tone === tone)) ?? 'pass'

	return worst === 'info' ? 'pass' : worst
}

export function goodPreviews(previews: SharePreview[]): number {
	return previews.filter((preview) => previewTone(preview.notes) === 'pass').length
}

export function assetSize(asset: ImageAsset): string {
	if (asset.format === 'svg') return 'SVG, any size'
	if (asset.sizes && asset.sizes.length > 1) return asset.sizes.join(', ').replaceAll('x', '×')

	return asset.width && asset.height ? `${asset.width}×${asset.height}` : 'Unknown size'
}

export function assetFacts(asset: ImageAsset): string {
	return [asset.format?.toUpperCase(), asset.bytes ? formatBytes(asset.bytes) : undefined]
		.filter(Boolean)
		.join(' · ')
}

export function facebookDebuggerUrl(url: string): string {
	return `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(url)}`
}

export function linkedinInspectorUrl(url: string): string {
	return `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(url)}`
}
