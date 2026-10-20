import type { PublicSettings } from '@shared/settings'
import type { NumberSetting, UpdateSettings } from '@web/screens/settings-screen'

export interface SettingSelectProps {
	id: string
	setting: NumberSetting
	options: { value: number; label: string }[]
	settings: PublicSettings
	onChange: UpdateSettings
}
