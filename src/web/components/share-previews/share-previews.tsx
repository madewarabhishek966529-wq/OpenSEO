'use client'

import { memo, useState } from 'react'
import { AssetTile } from './components/asset-tile'
import { MetaTags } from './components/meta-tags'
import { PlatformTab } from './components/platform-tab'
import { PreviewCard } from './components/preview-card'
import { ICON_LABEL } from './share-previews.constants'
import type { PlatformFilter, SharePreviewsProps } from './share-previews.types'
import { facebookDebuggerUrl, linkedinInspectorUrl, previewTone } from './share-previews.utils'

/** How a link to the page looks on each platform, then the images, icons and tags behind it. */
const SharePreviews = (props: SharePreviewsProps) => {
	const { sharing, url } = props

	const [filter, setFilter] = useState<PlatformFilter>('all')
	const shown = sharing.previews.filter((p) => filter === 'all' || p.platform === filter)
	const { ogImage, twitterImage, icons, manifest, themeColor } = sharing

	return (
		<div className="share-previews">
			<div className="filter-tabs share-tabs" role="tablist" aria-label="Show previews for">
				<PlatformTab
					value="all"
					label="All"
					selected={filter === 'all'}
					onSelect={setFilter}
				/>
				{sharing.previews.map((preview) => (
					<PlatformTab
						key={preview.platform}
						value={preview.platform}
						label={preview.name}
						tone={previewTone(preview.notes)}
						selected={filter === preview.platform}
						onSelect={setFilter}
					/>
				))}
			</div>

			<div className={`share-grid${shown.length === 1 ? ' is-single' : ''}`}>
				{shown.map((preview) => (
					<PreviewCard key={preview.platform} preview={preview} />
				))}
			</div>
			<p className="share-disclaimer muted">
				Previews follow each platform&apos;s published rules; the real thing can differ
				slightly. Platforms cache previews, so after changing your tags, refresh them in the{' '}
				<a href={facebookDebuggerUrl(url)} target="_blank" rel="noreferrer">
					Facebook Sharing Debugger
				</a>{' '}
				and the{' '}
				<a href={linkedinInspectorUrl(url)} target="_blank" rel="noreferrer">
					LinkedIn Post Inspector
				</a>
				.
			</p>

			<h3 className="share-subtitle">Share image and icons</h3>
			<ul className="asset-grid">
				<AssetTile label="og:image" asset={ogImage} source="Open Graph" wide />
				{twitterImage && twitterImage.url !== ogImage?.url && (
					<AssetTile label="twitter:image" asset={twitterImage} source="X" wide />
				)}
				{!icons.some((icon) => icon.kind === 'favicon') && (
					<AssetTile label="Favicon" source="Not in a <link> tag or at /favicon.ico" />
				)}
				{!icons.some((icon) => icon.kind === 'apple-touch-icon') && (
					<AssetTile
						label="Apple touch icon"
						source="Not in a <link> tag or at /apple-touch-icon.png"
					/>
				)}
				{icons.map((icon) => (
					<AssetTile
						key={icon.url}
						label={ICON_LABEL[icon.kind]}
						asset={icon}
						source={icon.source}
					/>
				))}
			</ul>
			<dl className="share-facts">
				<div>
					<dt>Theme color</dt>
					<dd>
						{themeColor ? (
							<>
								<span
									className="share-swatch"
									// Color only: background would also load a url() from the page.
									style={{ backgroundColor: themeColor }}
									aria-hidden="true"
								/>
								<span className="mono">{themeColor}</span>
							</>
						) : (
							'Not set'
						)}
					</dd>
				</div>
				<div>
					<dt>Web app manifest</dt>
					<dd>
						{manifest ? (
							<a href={manifest.url} target="_blank" rel="noreferrer">
								{manifest.ok
									? manifest.name || manifest.shortName || 'Unnamed'
									: `Broken (${manifest.error ?? 'unknown error'})`}
							</a>
						) : (
							'None'
						)}
					</dd>
				</div>
				{manifest?.ok && (
					<div>
						<dt>Manifest icons</dt>
						<dd className="mono">
							{manifest.iconSizes.join(', ').replaceAll('x', '×') || 'None'}
						</dd>
					</div>
				)}
			</dl>

			<MetaTags tags={sharing.tags} />
		</div>
	)
}

export default memo(SharePreviews)
