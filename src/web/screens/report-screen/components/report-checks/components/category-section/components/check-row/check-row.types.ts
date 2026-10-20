import type { CheckResult } from '@shared/types'

export interface CheckRowProps {
	check: CheckResult
}

export interface AiFixData {
	code?: string
	text: string
	explanation: string
}

