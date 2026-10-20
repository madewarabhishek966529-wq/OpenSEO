import { memo } from 'react'
import type { SettingSelectProps } from './setting-select.types'

const SettingSelect = (props: SettingSelectProps) => {
	const { id, setting, options, settings, onChange } = props

	return (
		<select
			id={id}
			className="select"
			value={settings[setting]}
			onChange={(e) => onChange({ [setting]: Number(e.currentTarget.value) })}
		>
			{options.map((o) => (
				<option key={o.value} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
	)
}

export default memo(SettingSelect)
