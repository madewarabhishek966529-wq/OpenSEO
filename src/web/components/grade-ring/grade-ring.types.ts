export type GradeRingSize = 'sm' | 'md' | 'lg'

export interface GradeRingProps {
	score: number
	grade: string
	size?: GradeRingSize
}
