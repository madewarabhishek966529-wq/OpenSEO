'use client'

import { memo, useState, type PointerEvent } from 'react'
import { absoluteDate } from '@web/lib/time'
import type { TrendLineProps } from './trend-line.types'
import { layoutPoints } from './trend-line.utils'

/** Score over time for one site, with a crosshair and tooltip on hover. */
const TrendLine = (props: TrendLineProps) => {
	const { points, width = 220, height = 56 } = props

	const [hover, setHover] = useState<number | null>(null)
	const placed = layoutPoints(points, width, height, 6)
	const path = placed
		.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
		.join(' ')
	const active = hover === null ? null : placed[hover]
	const last = placed[placed.length - 1]

	const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
		const box = e.currentTarget.getBoundingClientRect()
		const x = ((e.clientX - box.left) / box.width) * width
		let nearest = 0
		placed.forEach((p, i) => {
			if (Math.abs(p.x - x) < Math.abs(placed[nearest].x - x)) nearest = i
		})
		setHover(nearest)
	}

	return (
		<div className="trend-line" style={{ width }}>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				width={width}
				height={height}
				role="img"
				aria-label={`Score trend: ${points.map((p) => p.score).join(', ')}`}
				onPointerMove={handlePointerMove}
				onPointerLeave={() => setHover(null)}
			>
				<line
					className="trend-line-grid"
					x1={0}
					x2={width}
					y1={height / 2}
					y2={height / 2}
				/>
				<path className="trend-line-path" d={path} />
				{active && (
					<line
						className="trend-line-crosshair"
						x1={active.x}
						x2={active.x}
						y1={0}
						y2={height}
					/>
				)}
				{(active ?? last) && (
					<circle
						className="trend-line-dot"
						cx={(active ?? last).x}
						cy={(active ?? last).y}
						r={4}
					/>
				)}
			</svg>
			{active && (
				<span
					className="trend-line-tooltip"
					style={{ left: `${(active.x / width) * 100}%` }}
					role="status"
				>
					<strong className="mono">{active.score}</strong> {absoluteDate(active.date)}
				</span>
			)}
		</div>
	)
}

export default memo(TrendLine)
