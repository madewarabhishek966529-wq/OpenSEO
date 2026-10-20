import type { ThemeSetting } from '@shared/settings'

export interface ThemeOptionProps {
	value: ThemeSetting
	label: string
	checked: boolean
	onSelect(value: ThemeSetting): void
}
