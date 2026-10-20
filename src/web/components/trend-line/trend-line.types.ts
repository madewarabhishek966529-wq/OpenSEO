export interface TrendPoint {
	date: string
	score: number
}

export interface TrendLineProps {
	/** Oldest first. */
	points: TrendPoint[]
	width?: number
	height?: number
}
