import { memo } from 'react'
import { toneFor } from '@shared/grades'
import { RING_SIZES } from './grade-ring.constants'
import type { GradeRingProps } from './grade-ring.types'

/** A score from 0 to 100 as a ring, with the letter grade in the middle. */
const GradeRing = (props: GradeRingProps) => {
	const { score, grade, size = 'md' } = props

	const { box, stroke } = RING_SIZES[size]
	const radius = (box - stroke) / 2
	const circumference = 2 * Math.PI * radius
	const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference

	return (
		<div
			className={`grade-ring grade-ring--${size} is-${toneFor(score)}`}
			style={{ width: box, height: box }}
			role="img"
			aria-label={`Grade ${grade}, ${score} out of 100`}
		>
			<svg viewBox={`0 0 ${box} ${box}`} width={box} height={box} aria-hidden="true">
				<circle
					className="grade-ring-track"
					cx={box / 2}
					cy={box / 2}
					r={radius}
					strokeWidth={stroke}
				/>
				<circle
					className="grade-ring-value"
					cx={box / 2}
					cy={box / 2}
					r={radius}
					strokeWidth={stroke}
					strokeDasharray={`${filled} ${circumference}`}
					transform={`rotate(-90 ${box / 2} ${box / 2})`}
				/>
			</svg>
			<span className="grade-ring-text" aria-hidden="true">
				<span className="grade-ring-grade">{grade}</span>
				{size !== 'sm' && <span className="grade-ring-score">{score}</span>}
			</span>
		</div>
	)
}

export default memo(GradeRing)
