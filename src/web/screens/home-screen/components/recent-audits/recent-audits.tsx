import { memo } from 'react'
import Link from 'next/link'
import { displayUrl } from '@shared/format'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { relativeTime } from '@web/lib/time'
import type { RecentAuditsProps } from './recent-audits.types'

const RecentAudits = (props: RecentAuditsProps) => {
	const { reports, now } = props

	return (
		<ul className="report-list">
			{reports.map((report) => (
				<li key={report.id}>
					<Link className="report-list-item" href={`/report/${report.id}`}>
						<GradeRing score={report.score} grade={report.grade} size="sm" />
						<span className="report-list-text">
							<strong>{report.title || report.domain}</strong>
							<span className="muted mono">{displayUrl(report.finalUrl)}</span>
						</span>
						<span className="report-list-time muted">
							{relativeTime(report.createdAt, now)}
						</span>
						<Icon name="chevronRight" size={16} className="report-list-chevron" />
					</Link>
				</li>
			))}
		</ul>
	)
}

export default memo(RecentAudits)
