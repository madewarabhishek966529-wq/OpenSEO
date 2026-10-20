import { SCORE_DROP_OPTIONS, SSL_DAYS_OPTIONS } from '@shared/monitors'
import type { NumberRule } from './rule-select.types'

export const RULE_OPTIONS: Record<NumberRule, { value: number; label: string }[]> = {
	scoreDrop: SCORE_DROP_OPTIONS,
	sslDays: SSL_DAYS_OPTIONS
}
