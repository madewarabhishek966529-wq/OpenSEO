import { memo } from 'react'
import { VARIANT_CLASSES } from './button.constants'
import type { ButtonProps } from './button.types'

/** The app's button. It's `type="button"` unless you say otherwise, so it never submits a form by accident. */
const Button = (props: ButtonProps) => {
	const { variant = 'default', type = 'button', small = false, className, ...rest } = props

	const classes = [VARIANT_CLASSES[variant], small && 'button--small', className]
		.filter(Boolean)
		.join(' ')

	return <button type={type} className={classes} {...rest} />
}

export default memo(Button)
