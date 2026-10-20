import { memo } from 'react'
import { CATEGORY_BY_ID, PRIORITY_LABEL } from '@shared/grades'
import { CategoryTile } from '@web/components/category-tile'
import { StatusMark } from '@web/components/status-mark'
import { MAX_FIXES } from './priority-list.constants'
import type { PriorityListProps } from './priority-list.types'

/** The most important fixes, in the order to tackle them. */
const PriorityList = (props: PriorityListProps) => {
	const { checks } = props

	if (!checks.length) return null
	const shown = checks.slice(0, MAX_FIXES)

	return (
		<section className="report-card priority-list" aria-labelledby="fix-first">
			<div className="report-card-head">
				<h2 id="fix-first">Fix these first</h2>
				<span className="muted">
					{shown.length < checks.length
						? `Top ${shown.length} of ${checks.length}`
						: `${checks.length} in total`}
				</span>
			</div>
			<ol className="priority-items">
				{shown.map((check, index) => (
					<li key={check.id}>
						<a className="priority-item" href={`#check-${check.id}`}>
							<span className="priority-rank mono">
								{String(index + 1).padStart(2, '0')}
							</span>
							<StatusMark status={check.status} />
							<span className="priority-text">
								<strong>{check.title}</strong>
								<span>{check.summary}</span>
							</span>
							<span className={`chip priority-chip priority-chip--${check.priority}`}>
								{PRIORITY_LABEL[check.priority]}
							</span>
							<span
								className="priority-category"
								title={CATEGORY_BY_ID[check.category].name}
							>
								<CategoryTile category={check.category} size={22} />
							</span>
						</a>
					</li>
				))}
			</ol>
		</section>
	)
}

export default memo(PriorityList)
