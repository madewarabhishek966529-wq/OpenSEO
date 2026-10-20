import { memo } from 'react'
import type { InputProps } from './input.types'

/** The app's text field. */
const Input = (props: InputProps) => {
	const { className, ...rest } = props

	const classes = className ? `text-input ${className}` : 'text-input'

	return <input className={classes} {...rest} />
}

export default memo(Input)
