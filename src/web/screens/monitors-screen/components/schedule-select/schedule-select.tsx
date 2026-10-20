import { memo } from 'react'
import { FIELD_LABELS } from './schedule-select.constants'
import type { ScheduleSelectProps } from './schedule-select.types'
import { optionsFor, parseValue } from './schedule-select.utils'

/** One part of a monitor's schedule: how often, the day, the time or the time zone. */
const ScheduleSelect = (props: ScheduleSelectProps) => {
	const { id, field, schedule, timeZones = [], disabled, onChange } = props

	return (
		<select
			id={id}
			className={`select schedule-select schedule-select--${field}`}
			aria-label={FIELD_LABELS[field]}
			value={schedule[field]}
			disabled={disabled}
			onChange={(e) => onChange({ [field]: parseValue(field, e.currentTarget.value) })}
		>
			{optionsFor(field, schedule, timeZones).map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	)
}

export default memo(ScheduleSelect)
