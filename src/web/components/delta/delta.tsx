import { memo } from 'react'
import { formatChange } from '@shared/compare'
import { Icon } from '@web/components/icon'
import { TONE_LABELS } from './delta.constants'
import type { DeltaProps } from './delta.types'
import { arrowFor, toneOf } from './delta.utils'

/** How much a number moved: an arrow for the direction, a tint and a hidden label for good or bad. */
const Delta = (props: DeltaProps) => {
	const { change, better = 'higher', text, size = 'sm' } = props

	const tone = toneOf(change, better)
	const arrow = arrowFor(change)

	return (
		<span className={`delta delta--${size} is-${tone}`}>
			{arrow && <Icon name={arrow} size={size === 'lg' ? 18 : 13} />}
			<span className="mono">{text ?? formatChange(change)}</span>
			{TONE_LABELS[tone] && <span className="sr-only">({TONE_LABELS[tone]})</span>}
		</span>
	)
}

export default memo(Delta)
