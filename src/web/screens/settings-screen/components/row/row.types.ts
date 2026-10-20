import type { ReactNode } from 'react'

export interface RowProps {
	label: string
	note?: string
	htmlFor?: string
	children: ReactNode
}
