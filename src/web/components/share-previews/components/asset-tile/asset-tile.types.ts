import type { ImageAsset } from '@shared/types'

export interface AssetTileProps {
	label: string
	/** Missing when the page doesn't declare the image at all. */
	asset?: ImageAsset
	/** Where the page declares it. */
	source: string
	/** Share images are wide; icons are square. */
	wide?: boolean
}
