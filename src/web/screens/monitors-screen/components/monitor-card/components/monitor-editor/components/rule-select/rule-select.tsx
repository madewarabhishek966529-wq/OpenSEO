import { memo } from 'react'
import type { RuleSelectProps } from './rule-select.types'
import { optionsFor } from './rule-select.utils'

/** A threshold for one kind of alert: points for the score, days for the SSL certificate. */
const RuleSelect = (props: RuleSelectProps) => {
	const { id, field, rules, onChange } = props

	return (
		<select
			id={id}
			className="select"
			value={rules[field]}
			onChange={(e) => onChange({ [field]: Number(e.currentTarget.value) })}
		>
			{optionsFor(field, rules[field]).map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	)
}

export default memo(RuleSelect)
