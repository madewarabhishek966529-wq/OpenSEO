import { CATEGORIES, PRIORITY_RANK, STATUS_VALUE, gradeFor } from '@shared/grades'
import type { CategoryResult, CheckResult, Status } from '@shared/types'

/** A category's score is the weighted share of its checks that pass (warnings count half). */
export function scoreCategories(checks: CheckResult[]): CategoryResult[] {
	return CATEGORIES.map((category) => {
		const own = checks.filter((c) => c.category === category.id)
		const scored = own.filter((c) => c.status !== 'info' && c.weight > 0)
		const total = scored.reduce((n, c) => n + c.weight, 0)
		const earned = scored.reduce((n, c) => n + c.weight * STATUS_VALUE[c.status], 0)
		const score = total ? Math.round((earned / total) * 100) : 100
		const counts: Record<Status, number> = { pass: 0, warn: 0, fail: 0, info: 0 }
		own.forEach((c) => counts[c.status]++)

		return { id: category.id, name: category.name, score, grade: gradeFor(score), counts }
	})
}

/** The overall score weighs each category by how much it matters for search. */
export function overallScore(categories: CategoryResult[]): number {
	let total = 0
	let earned = 0
	for (const category of categories) {
		const weight = CATEGORIES.find((c) => c.id === category.id)?.weight ?? 0
		total += weight
		earned += weight * category.score
	}

	return total ? Math.round(earned / total) : 0
}

/** Checks that need attention, most important first. */
export function recommendations(checks: CheckResult[]): CheckResult[] {
	return checks
		.filter((c) => c.status === 'fail' || c.status === 'warn')
		.sort(
			(a, b) =>
				PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
				STATUS_VALUE[a.status] - STATUS_VALUE[b.status] ||
				b.weight - a.weight
		)
}
