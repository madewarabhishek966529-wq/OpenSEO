import type { IconName } from '@web/components/icon'
import type { Status } from '@shared/types'

export const STATUS_ICONS: Record<Status, IconName> = {
	pass: 'check',
	warn: 'alert',
	fail: 'close',
	info: 'info'
}
