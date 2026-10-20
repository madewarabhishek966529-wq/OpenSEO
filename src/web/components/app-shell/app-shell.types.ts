import type { ReactNode } from 'react'
import type { IconName } from '@web/components/icon'

export interface AppShellProps {
	children: ReactNode
	brandName: string
	brandLogo?: string
}

export interface NavEntry {
	href: string
	label: string
	icon: IconName
}

export interface NavGroup {
	title: string
	items: NavEntry[]
}
