import { memo } from 'react'
import type { FilterTabProps } from './filter-tab.types'

const FilterTab = (props: FilterTabProps) => {
	const { value, label, tone, count, selected, onSelect } = props

	return (
		<button
			type="button"
			role="tab"
			aria-selected={selected}
			className="filter-tab"
			onClick={() => onSelect(value)}
		>
			<span className={`filter-tab-mark${tone ? ` is-${tone}` : ''}`} aria-hidden="true" />
			{label}
			<span className="filter-tab-count mono">{count}</span>
		</button>
	)
}

export default memo(FilterTab)
