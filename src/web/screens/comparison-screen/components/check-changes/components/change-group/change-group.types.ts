import type { ReportComparison } from '@shared/compare'
import type { ChangeGroupInfo } from '@web/screens/comparison-screen/components/check-changes'

export interface ChangeGroupProps {
	group: ChangeGroupInfo
	comparison: ReportComparison
}
