import type { IconName } from '@web/components/icon'
import type { DeltaProps, DeltaTone } from './delta.types'

export function toneOf(change: number, better: DeltaProps['better']): DeltaTone {
	if (!change || !better) return 'neutral'

	return change > 0 === (better === 'higher') ? 'pass' : 'fail'
}

/** Up or down; nothing when the number didn't move, since "±0" says it. */
export function arrowFor(change: number): IconName | null {
	if (!change) return null

	return change > 0 ? 'arrowUp' : 'arrowDown'
}
