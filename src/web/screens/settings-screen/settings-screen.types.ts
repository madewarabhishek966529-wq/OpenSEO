import type { PublicSettings, Settings } from '@shared/settings'

export interface SettingsScreenProps {
	settings: PublicSettings
	version: string
}

/** Saves some settings and returns nothing; the screen shows the result. */
export type UpdateSettings = (patch: Partial<Settings>) => void

/** The settings that are on or off. */
export type BooleanSetting = {
	[K in keyof PublicSettings]: PublicSettings[K] extends boolean ? K : never
}[keyof PublicSettings] &
	keyof Settings

/** The settings picked from a list of numbers. */
export type NumberSetting = {
	[K in keyof Settings]: Settings[K] extends number ? K : never
}[keyof Settings]
