import type { UpdateSettings } from '@web/screens/settings-screen'

export interface EmailsFieldProps {
	id: string
	emails: string[]
	onChange: UpdateSettings
}
