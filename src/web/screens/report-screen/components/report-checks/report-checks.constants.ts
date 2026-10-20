import type { Status } from '@shared/types'
import type { CheckFilter } from './report-checks.types'

export const FILTERS: { value: CheckFilter; label: string; tone: Status | null }[] = [
	{ value: 'all', label: 'All checks', tone: null },
	{ value: 'issues', label: 'Needs work', tone: 'fail' },
	{ value: 'passed', label: 'Passed', tone: 'pass' }
]
