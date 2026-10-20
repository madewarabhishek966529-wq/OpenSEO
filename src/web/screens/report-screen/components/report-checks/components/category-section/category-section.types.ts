import type { CategoryResult, CheckResult } from '@shared/types'

export interface CategorySectionProps {
	category: CategoryResult
	/** The category's checks that match the current filter. */
	checks: CheckResult[]
}
