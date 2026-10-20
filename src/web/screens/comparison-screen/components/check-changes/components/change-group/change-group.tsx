import { memo } from 'react'
import { Icon } from '@web/components/icon'
import { ChangeRow } from './components/change-row'
import type { ChangeGroupProps } from './change-group.types'

/** One kind of change, as a section that opens and closes. */
const ChangeGroup = (props: ChangeGroupProps) => {
	const { group, comparison } = props

	return (
		<details className="change-group" open={group.open}>
			<summary className="change-group-head">
				<span className={`change-group-mark is-${group.tone}`} aria-hidden="true" />
				<span className="change-group-title">{group.title}</span>
				<span className="change-group-count mono">{group.checks.length}</span>
				<span className="change-group-description muted">{group.description}</span>
				<Icon name="chevronDown" size={16} className="change-group-chevron" />
			</summary>
			<ul className="change-list">
				{group.checks.map((check) => (
					<ChangeRow key={check.id} check={check} comparison={comparison} />
				))}
			</ul>
		</details>
	)
}

export default memo(ChangeGroup)
