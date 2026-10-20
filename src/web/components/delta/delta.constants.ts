import type { DeltaTone } from './delta.types'

/** Read out after the number, so the tint never carries the meaning alone. */
export const TONE_LABELS: Record<DeltaTone, string> = {
	pass: 'better',
	fail: 'worse',
	neutral: ''
}
