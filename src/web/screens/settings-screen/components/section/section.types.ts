import type { ReactNode } from 'react'

export interface SectionProps {
	/** For links to the section, like /settings#alerts. */
	id?: string
	title: string
	description?: string
	children: ReactNode
}
