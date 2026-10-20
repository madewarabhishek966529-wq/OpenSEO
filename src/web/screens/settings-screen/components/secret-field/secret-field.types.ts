import type { SecretSetting } from '@shared/settings'
import type { UpdateSettings } from '@web/screens/settings-screen'

export interface SecretFieldProps {
	id: string
	setting: SecretSetting
	/** A value is saved. */
	isSet: boolean
	/** The environment variable that sets it instead, when it does. */
	fromEnv?: string
	placeholder: string
	onChange: UpdateSettings
}
