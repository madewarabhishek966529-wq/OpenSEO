import { memo } from 'react'
import type { ThemeOptionProps } from './theme-option.types'

const ThemeOption = (props: ThemeOptionProps) => {
	const { value, label, checked, onSelect } = props

	return (
		<button
			type="button"
			role="radio"
			aria-checked={checked}
			className="segmented-option"
			onClick={() => onSelect(value)}
		>
			{label}
		</button>
	)
}

export default memo(ThemeOption)
