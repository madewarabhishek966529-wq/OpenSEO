'use client'

import { memo, useState } from 'react'
import { CategorySection } from './components/category-section'
import { FilterTab } from './components/filter-tab'
import { FILTERS } from './report-checks.constants'
import type { CheckFilter, ReportChecksProps } from './report-checks.types'
import { matchesFilter } from './report-checks.utils'

/** Every check, grouped by category, with tabs to show only problems or only passes. */
const ReportChecks = (props: ReportChecksProps) => {
	const { report } = props

	const [filter, setFilter] = useState<CheckFilter>('all')

	return (
		<section className="report-checks" aria-label="All checks">
			<div className="filter-tabs" role="tablist" aria-label="Show checks">
				{FILTERS.map((f) => (
					<FilterTab
						key={f.value}
						value={f.value}
						label={f.label}
						tone={f.tone}
						count={report.checks.filter((c) => matchesFilter(c, f.value)).length}
						selected={filter === f.value}
						onSelect={setFilter}
					/>
				))}
			</div>
			{report.categories.map((category) => (
				<CategorySection
					key={category.id}
					category={category}
					checks={report.checks.filter(
						(c) => c.category === category.id && matchesFilter(c, filter)
					)}
				/>
			))}
		</section>
	)
}

export default memo(ReportChecks)
