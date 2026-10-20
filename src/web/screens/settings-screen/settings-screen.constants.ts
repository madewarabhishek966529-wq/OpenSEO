import type { ThemeSetting } from '@shared/settings'

export const THEMES: { value: ThemeSetting; label: string }[] = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'system', label: 'Match system' }
]
