import type { Status } from '@shared/types'
import type { PlatformFilter } from '@web/components/share-previews'

export interface PlatformTabProps {
	value: PlatformFilter
	label: string
	/** How the platform's preview looks overall; the "All" tab has none. */
	tone?: Status
	selected: boolean
	onSelect: (value: PlatformFilter) => void
}
