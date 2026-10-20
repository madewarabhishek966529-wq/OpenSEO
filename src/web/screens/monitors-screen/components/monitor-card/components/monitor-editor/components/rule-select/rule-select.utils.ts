import { RULE_OPTIONS } from './rule-select.constants'
import type { NumberRule } from './rule-select.types'

/** The usual choices, plus the current value if it was set to something else through the API. */
export function optionsFor(field: NumberRule, value: number): { value: number; label: string }[] {
	const options = RULE_OPTIONS[field]
	if (options.some((o) => o.value === value)) return options
	const label = field === 'scoreDrop' ? `By ${value} points or more` : `Warn ${value} days before`

	return [...options, { value, label }].sort((a, b) => a.value - b.value)
}
