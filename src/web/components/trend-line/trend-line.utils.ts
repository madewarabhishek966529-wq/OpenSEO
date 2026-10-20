import type { TrendPoint } from './trend-line.types'

/** Where each point sits in the chart, with scores on a fixed 0–100 scale. */
export function layoutPoints(points: TrendPoint[], width: number, height: number, pad: number) {
	const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0

	return points.map((p, i) => ({
		...p,
		x: points.length > 1 ? pad + i * step : width / 2,
		y: pad + (1 - p.score / 100) * (height - pad * 2)
	}))
}
