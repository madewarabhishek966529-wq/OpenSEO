import { memo } from 'react'
import { PRIORITY_LABEL } from '@shared/grades'
import { StatusMark } from '@web/components/status-mark'
import { PRIORITY_TONE } from './issue-item.constants'
import type { IssueItemProps } from './issue-item.types'

const IssueItem = (props: IssueItemProps) => {
	const { issue, fix, selected, onSelect } = props

	return (
		<li>
			<button
				type="button"
				className={`issue-item${selected ? ' is-selected' : ''}`}
				aria-pressed={selected}
				onClick={() => onSelect(selected ? 'all' : issue.id)}
			>
				<StatusMark status={PRIORITY_TONE[issue.priority]} size={20} />
				<span className="issue-item-text">
					<strong>{issue.title}</strong>
					<span>{fix}</span>
					<span className="sr-only">{PRIORITY_LABEL[issue.priority]}</span>
				</span>
				<span className="issue-item-count mono">{issue.count}</span>
			</button>
		</li>
	)
}

export default memo(IssueItem)
