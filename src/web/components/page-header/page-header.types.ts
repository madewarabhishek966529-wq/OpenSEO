import type { ReactNode } from 'react'

export interface PageHeaderProps {
	title: string
	description?: ReactNode
	eyebrow?: string
	actions?: ReactNode
}
