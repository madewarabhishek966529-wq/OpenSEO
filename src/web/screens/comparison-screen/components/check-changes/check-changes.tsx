import { memo } from 'react'
import { ChangeGroup } from './components/change-group'
import type { CheckChangesProps } from './check-changes.types'
import { changedLabel, groupsFor } from './check-changes.utils'

/** Every check, grouped by how it changed from the first audit to the second. */
const CheckChanges = (props: CheckChangesProps) => {
	const { comparison } = props

	const groups = groupsFor(comparison)
	const changed = comparison.checks.filter(
		(c) => c.kind !== 'still-passing' && c.kind !== 'still-failing'
	).length

	return (
		<section className="report-card check-changes" aria-labelledby="changes-title">
			<div className="report-card-head">
				<h2 id="changes-title">
					{comparison.samePage ? 'What changed' : 'Check by check'}
				</h2>
				<span className="muted">{changedLabel(changed, comparison.samePage)}</span>
			</div>
			<div className="change-groups">
				{groups.map((group) => (
					<ChangeGroup key={group.id} group={group} comparison={comparison} />
				))}
			</div>
		</section>
	)
}

export default memo(CheckChanges)
