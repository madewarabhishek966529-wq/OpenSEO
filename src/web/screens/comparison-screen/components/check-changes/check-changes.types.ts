import type { ChangeKind, CheckComparison, ReportComparison } from '@shared/compare'
import type { Status } from '@shared/types'

export interface CheckChangesProps {
	comparison: ReportComparison
}

/** A heading in the list of changes and the checks under it. */
export interface ChangeGroupInfo {
	id: string
	title: string
	description: string
	/** Tint of the mark next to the title. */
	tone: Status
	/** Shown expanded at first. */
	open: boolean
	checks: CheckComparison[]
}

/** A group before its checks are filled in: which kinds of change it collects. */
export type GroupSpec = Omit<ChangeGroupInfo, 'checks'> & { kinds: ChangeKind[] }
