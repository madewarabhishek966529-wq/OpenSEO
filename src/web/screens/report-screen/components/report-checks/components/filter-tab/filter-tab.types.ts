import type { Status } from '@shared/types'
import type { CheckFilter } from '@web/screens/report-screen/components/report-checks'

export interface FilterTabProps {
	value: CheckFilter
	label: string
	tone: Status | null
	count: number
	selected: boolean
	onSelect(value: CheckFilter): void
}
