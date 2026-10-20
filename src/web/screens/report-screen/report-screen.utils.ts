import { PRIORITY_RANK, STATUS_VALUE } from '@shared/grades'
import type { CheckResult } from '@shared/types'

/** Checks that need attention, most important first. */
export function recommendationsOf(checks: CheckResult[]): CheckResult[] {
	return checks
		.filter((c) => c.status === 'fail' || c.status === 'warn')
		.sort(
			(a, b) =>
				PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
				STATUS_VALUE[a.status] - STATUS_VALUE[b.status] ||
				b.weight - a.weight
		)
}
