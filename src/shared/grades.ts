import type { CategoryId, Priority, Status } from './types'

export interface CategoryInfo {
	id: CategoryId
	name: string
	description: string
	/** Share of the overall score. */
	weight: number
}

export const CATEGORIES: CategoryInfo[] = [
	{
		id: 'onpage',
		name: 'On-page SEO',
		description: 'What search engines read: titles, headings, content and markup.',
		weight: 30
	},
	{
		id: 'performance',
		name: 'Performance',
		description: 'How quickly the page arrives and how heavy it is.',
		weight: 20
	},
	{
		id: 'usability',
		name: 'Usability',
		description: 'How the page works on phones and for everyone using it.',
		weight: 12
	},
	{
		id: 'security',
		name: 'Security',
		description: 'HTTPS, certificates, headers and email authentication.',
		weight: 12
	},
	{
		id: 'links',
		name: 'Links',
		description: 'Broken links, link text and how the page links out.',
		weight: 10
	},
	{
		id: 'social',
		name: 'Social',
		description: 'How the page looks when shared, and its social profiles.',
		weight: 8
	},
	{
		id: 'ai',
		name: 'AI search',
		description: 'Whether AI assistants and answer engines can read and cite the page.',
		weight: 8
	}
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
	CategoryId,
	CategoryInfo
>

const GRADES: [number, string][] = [
	[95, 'A+'],
	[90, 'A'],
	[85, 'A-'],
	[80, 'B+'],
	[75, 'B'],
	[70, 'B-'],
	[65, 'C+'],
	[60, 'C'],
	[55, 'C-'],
	[50, 'D+'],
	[45, 'D'],
	[40, 'D-']
]

/** A letter grade for a 0–100 score. */
export function gradeFor(score: number): string {
	return GRADES.find(([min]) => score >= min)?.[1] ?? 'F'
}

/** The tone a score is shown in: green from 80, amber from 55, red below. */
export function toneFor(score: number): Status {
	if (score >= 80) return 'pass'

	return score >= 55 ? 'warn' : 'fail'
}

export const STATUS_VALUE: Record<Status, number> = { pass: 1, warn: 0.5, fail: 0, info: 0 }

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

export const STATUS_LABEL: Record<Status, string> = {
	pass: 'Passed',
	warn: 'Needs work',
	fail: 'Failed',
	info: 'Info'
}

export const PRIORITY_LABEL: Record<Priority, string> = {
	high: 'High priority',
	medium: 'Medium priority',
	low: 'Low priority'
}
