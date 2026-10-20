import { memo } from 'react'
import { Icon } from '@web/components/icon'
import type { EmptyStateProps } from './empty-state.types'

const EmptyState = (props: EmptyStateProps) => {
	const { icon, title, children } = props

	return (
		<div className="empty-state">
			<span className="empty-state-icon">
				<Icon name={icon} size={22} />
			</span>
			<h3>{title}</h3>
			{children && <div className="empty-state-body">{children}</div>}
		</div>
	)
}

export default memo(EmptyState)
