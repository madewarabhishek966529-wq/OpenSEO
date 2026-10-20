import { memo } from 'react'
import Link from 'next/link'
import { pageKey } from '@shared/compare'
import { formatCount } from '@shared/format'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { TrendLine } from '@web/components/trend-line'
import { ReportRow } from './components/report-row'
import type { DomainCardProps } from './domain-card.types'

/** One site: its latest grade, a trend line when it has been audited more than once, and each audit. */
const DomainCard = (props: DomainCardProps) => {
	const { history, now, onDelete } = props

	const [latest] = history.reports
	const previous = history.reports
		.slice(1)
		.find((r) => pageKey(r.finalUrl) === pageKey(latest.finalUrl))
	const trend = [...history.reports].reverse().map((r) => ({ date: r.createdAt, score: r.score }))

	return (
		<section className="domain-card">
			<header className="domain-card-head">
				<GradeRing score={latest.score} grade={latest.grade} size="md" />
				<div className="domain-card-title">
					<h2>{history.domain}</h2>
					<span className="muted">{formatCount(history.reports.length, 'audit')}</span>
				</div>
				{trend.length > 1 && (
					<div className="domain-card-trend">
						<span className="section-label">Score over time</span>
						<TrendLine points={trend} />
					</div>
				)}
				{previous && (
					<Link
						className="button button--small"
						href={`/report/${previous.id}/compare/${latest.id}`}
						title="Compare the latest audit with the one before it"
					>
						<Icon name="compare" size={15} />
						Compare last two
					</Link>
				)}
			</header>
			<ul className="domain-card-reports">
				{history.reports.map((report) => (
					<ReportRow key={report.id} report={report} now={now} onDelete={onDelete} />
				))}
			</ul>
		</section>
	)
}

export default memo(DomainCard)
