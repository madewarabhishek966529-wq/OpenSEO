import { memo } from 'react'
import type { SettingToggleProps } from './setting-toggle.types'

const SettingToggle = (props: SettingToggleProps) => {
	const { id, setting, settings, onChange } = props

	return (
		<button
			type="button"
			role="switch"
			id={id}
			className="toggle"
			aria-checked={settings[setting]}
			onClick={() => onChange({ [setting]: !settings[setting] })}
		/>
	)
}

export default memo(SettingToggle)
