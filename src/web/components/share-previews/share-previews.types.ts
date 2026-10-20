import type { SharePlatform, SharingReport } from '@shared/types'

export interface SharePreviewsProps {
	sharing: SharingReport
	/** The page's address, for the links to each platform's own preview tool. */
	url: string
}

export type PlatformFilter = SharePlatform | 'all'
