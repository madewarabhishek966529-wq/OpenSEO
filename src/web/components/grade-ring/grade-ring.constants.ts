import type { GradeRingSize } from './grade-ring.types'

/** Diameter and stroke width of the ring, in pixels. */
export const RING_SIZES: Record<GradeRingSize, { box: number; stroke: number }> = {
	sm: { box: 40, stroke: 4 },
	md: { box: 72, stroke: 6 },
	lg: { box: 148, stroke: 10 }
}
