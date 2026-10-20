import { memo } from 'react'
import { CATEGORY_BY_ID } from '@shared/grades'
import { CategoryTile } from '@web/components/category-tile'
import { GradeRing } from '@web/components/grade-ring'
import { CheckRow } from './components/check-row'
import type { CategorySectionProps } from './category-section.types'

const CategorySection = (props: CategorySectionProps) => {
	const { category, checks } = props

	const { counts } = category

	return (
		<section className="report-card category-section" id={`cat-${category.id}`}>
			<header className="category-section-head">
				<CategoryTile category={category.id} size={36} />
				<div className="category-section-title">
					<h2>{category.name}</h2>
					<p className="muted">{CATEGORY_BY_ID[category.id].description}</p>
				</div>
				<ul className="category-section-counts" aria-label="Results">
					<li className="chip chip--pass">
						<span className="chip-dot" />
						{counts.pass} passed
					</li>
					{counts.warn > 0 && (
						<li className="chip chip--warn">
							<span className="chip-dot" />
							{counts.warn} to improve
						</li>
					)}
					{counts.fail > 0 && (
						<li className="chip chip--fail">
							<span className="chip-dot" />
							{counts.fail} failed
						</li>
					)}
				</ul>
				<GradeRing score={category.score} grade={category.grade} size="md" />
			</header>
			{checks.length ? (
				<ul className="check-list">
					{checks.map((check) => (
						<CheckRow key={check.id} check={check} />
					))}
				</ul>
			) : (
				<p className="category-section-empty muted">No checks match this filter.</p>
			)}
		</section>
	)
}

export default memo(CategorySection)
