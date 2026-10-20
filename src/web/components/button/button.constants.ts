import type { ButtonVariant } from './button.types'

export const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	default: 'button',
	primary: 'button button--primary',
	accent: 'button button--accent',
	quiet: 'button button--quiet',
	danger: 'button button--danger-solid',
	'danger-quiet': 'button button--quiet button--danger',
	icon: 'icon-button'
}
