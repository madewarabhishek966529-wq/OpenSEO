import type { IconKind, SharePlatform, Status } from '@shared/types'

/** What kind of preview each platform shows. */
export const PLATFORM_KIND: Record<SharePlatform, string> = {
	google: 'Search result',
	facebook: 'Feed post',
	x: 'Post',
	linkedin: 'Feed post',
	slack: 'Message unfurl',
	discord: 'Message embed',
	whatsapp: 'Chat message',
	imessage: 'Message',
	telegram: 'Chat message'
}

/** Worst first, to pick the mark a platform's tab gets. */
export const TONE_ORDER: Status[] = ['fail', 'warn', 'info', 'pass']

export const ICON_LABEL: Record<IconKind, string> = {
	favicon: 'Favicon',
	'apple-touch-icon': 'Apple touch icon',
	manifest: 'Manifest icon',
	'mask-icon': 'Safari pinned tab'
}
