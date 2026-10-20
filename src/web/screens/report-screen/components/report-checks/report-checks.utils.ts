import type { CheckResult } from '@shared/types'
import type { CheckFilter } from './report-checks.types'

export function matchesFilter(check: CheckResult, filter: CheckFilter): boolean {
	if (filter === 'issues') return check.status === 'fail' || check.status === 'warn'
	if (filter === 'passed') return check.status === 'pass'

	return true
}
