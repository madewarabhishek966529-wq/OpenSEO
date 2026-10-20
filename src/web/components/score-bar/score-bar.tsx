import { memo } from 'react'
import { toneFor } from '@shared/grades'
import type { ScoreBarProps } from './score-bar.types'

/** A thin 0–100 bar, tinted by how good the score is. The number is shown next to it by the parent. */
const ScoreBar = (props: ScoreBarProps) => {
	const { score } = props

	return (
		<span className={`score-bar is-${toneFor(score)}`} aria-hidden="true">
			<span className="score-bar-fill" style={{ width: `${Math.max(2, score)}%` }} />
		</span>
	)
}

export default memo(ScoreBar)
