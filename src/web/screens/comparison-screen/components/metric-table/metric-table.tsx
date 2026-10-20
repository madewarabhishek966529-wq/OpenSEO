import { memo } from 'react'
import { formatMetric } from '@shared/compare'
import { Delta } from '@web/components/delta'
import type { MetricTableProps } from './metric-table.types'
import { changeText } from './metric-table.utils'

/** Speed and weight in both audits. Timings come from the server that ran the audit. */
const MetricTable = (props: MetricTableProps) => {
	const { comparison } = props

	const { a, b, metrics, samePage } = comparison

	return (
		<section className="report-card" aria-labelledby="by-metric">
			<div className="report-card-head">
				<h2 id="by-metric">Speed and size</h2>
			</div>
			<div className="detail-scroll">
				<table className="data-table comparison-table">
					<thead>
						<tr>
							<th scope="col">Metric</th>
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
						{metrics.map((metric) => (
							<tr key={metric.id}>
								<th scope="row">{metric.label}</th>
								<td className="mono">{formatMetric(metric.unit, metric.a)}</td>
								<td className="mono">{formatMetric(metric.unit, metric.b)}</td>
								<td className="comparison-table-change">
									<Delta
										change={metric.b - metric.a}
										better={samePage ? metric.better : null}
										text={changeText(metric)}
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

export default memo(MetricTable)
