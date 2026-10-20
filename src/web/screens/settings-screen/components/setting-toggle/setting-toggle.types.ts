import type { PublicSettings } from '@shared/settings'
import type { BooleanSetting, UpdateSettings } from '@web/screens/settings-screen'

export interface SettingToggleProps {
	id: string
	setting: BooleanSetting
	settings: PublicSettings
	onChange: UpdateSettings
}
