import { memo } from 'react'
import { CategoryTile } from '@web/components/category-tile'
import { Delta } from '@web/components/delta'
import type { CategoryTableProps } from './category-table.types'

/** Each category's grade in both audits and how far it moved. */
const CategoryTable = (props: CategoryTableProps) => {
	const { comparison } = props

	const { a, b, categories, samePage } = comparison

	return (
		<section className="report-card" aria-labelledby="by-category">
			<div className="report-card-head">
				<h2 id="by-category">By category</h2>
			</div>
			<div className="detail-scroll">
				<table className="data-table comparison-table">
					<thead>
						<tr>
							<th scope="col">Category</th>
							<th scope="col" className="comparison-table-side" title={a.label}>
								{a.label}
							</th>
							<th scope="col" className="comparison-table-side" title={b.label}>
								{b.label}
							</th>
							<th scope="col" className="comparison-table-change">
								Change
							</th>
						</tr>
					</thead>
					<tbody>
						{categories.map((category) => (
							<tr key={category.id}>
								<th scope="row">
									<span className="comparison-table-name">
										<CategoryTile category={category.id} size={22} />
										{category.name}
									</span>
								</th>
								<td className="mono">
									{category.a.grade}{' '}
									<span className="muted">{category.a.score}</span>
								</td>
								<td className="mono">
									{category.b.grade}{' '}
									<span className="muted">{category.b.score}</span>
								</td>
								<td className="comparison-table-change">
									<Delta
										change={category.change}
										better={samePage ? 'higher' : null}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	)
}

export default memo(CategoryTable)
