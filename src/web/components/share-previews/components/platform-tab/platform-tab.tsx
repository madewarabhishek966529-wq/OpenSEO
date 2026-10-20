import { memo } from 'react'
import { StatusMark } from '@web/components/status-mark'
import type { PlatformTabProps } from './platform-tab.types'

const PlatformTab = (props: PlatformTabProps) => {
	const { value, label, tone, selected, onSelect } = props

	return (
		<button
			type="button"
			role="tab"
			aria-selected={selected}
			className="filter-tab"
			onClick={() => onSelect(value)}
		>
			{tone && <StatusMark status={tone} size={16} />}
			{label}
		</button>
	)
}

export default memo(PlatformTab)
