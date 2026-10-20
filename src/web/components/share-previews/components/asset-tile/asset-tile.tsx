import { memo } from 'react'
import { StatusMark } from '@web/components/status-mark'
import { assetFacts, assetSize } from '@web/components/share-previews/share-previews.utils'
import { PreviewImage } from '@web/components/share-previews/components/preview-image'
import type { AssetTileProps } from './asset-tile.types'

/** One image or icon: what it looks like, its real size, its weight and whether it loads. */
const AssetTile = (props: AssetTileProps) => {
	const { label, asset, source, wide = false } = props

	const status = asset?.ok ? 'pass' : 'fail'

	return (
		<li className={`asset-tile${wide ? ' is-wide' : ''}`}>
			<span className="asset-tile-preview">
				<PreviewImage
					className="asset-tile-image"
					src={asset?.ok ? asset.url : undefined}
				/>
			</span>
			<span className="asset-tile-text">
				<span className="asset-tile-head">
					<StatusMark status={status} size={16} />
					<strong>{label}</strong>
				</span>
				{asset ? (
					<>
						<span className="mono">{asset.ok ? assetSize(asset) : asset.error}</span>
						{asset.ok && <span className="muted">{assetFacts(asset)}</span>}
						<a
							className="asset-tile-url mono"
							href={asset.url}
							target="_blank"
							rel="noreferrer"
							title={asset.url}
						>
							{asset.url.replace(/^https?:\/\//, '')}
						</a>
					</>
				) : (
					<span className="muted">Not set</span>
				)}
				<span className="asset-tile-source muted">{source}</span>
			</span>
		</li>
	)
}

export default memo(AssetTile)
