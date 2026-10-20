import type { IconName } from '@web/components/icon'

export interface NavItemProps {
	href: string
	label: string
	icon: IconName
	active: boolean
}
