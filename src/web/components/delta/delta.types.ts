/** Green for a step forward, red for a step back, gray when neither applies. */
export type DeltaTone = 'pass' | 'fail' | 'neutral'

export interface DeltaProps {
	/** The difference, the new value minus the old one. */
	change: number
	/** Which way is good: higher for scores, lower for times and sizes, null when neither. */
	better?: 'higher' | 'lower' | null
	/** The difference as text, like "+120 ms". Defaults to "+6", "−4" or "±0". */
	text?: string
	size?: 'sm' | 'lg'
}
