import type { ReactNode } from 'react'
import type { IconName } from '@web/components/icon'

export interface EmptyStateProps {
	icon: IconName
	title: string
	children?: ReactNode
}
