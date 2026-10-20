import type { AlertRules } from '@shared/monitors'

/** The alert rules picked from a list of numbers. */
export type NumberRule = 'scoreDrop' | 'sslDays'

export interface RuleSelectProps {
	id: string
	field: NumberRule
	rules: AlertRules
	onChange(patch: Partial<AlertRules>): void
}
