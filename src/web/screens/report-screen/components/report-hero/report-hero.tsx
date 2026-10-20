import { memo } from 'react'
import { formatBytes, formatMs, formatNumber } from '@shared/format'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { absoluteDate } from '@web/lib/time'
import type { ReportHeroProps } from './report-hero.types'
import { verdict } from './report-hero.utils'

const ReportHero = (props: ReportHeroProps) => {
	const { report, issues } = props

	const { overview } = report
	const metrics = [
		{ label: 'Server response', value: formatMs(overview.responseTimeMs) },
		{ label: 'Download time', value: formatMs(overview.loadTimeMs) },
		{ label: 'Page size', value: formatBytes(overview.pageSizeBytes) },
		{ label: 'Requests', value: formatNumber(overview.requests) },
		{ label: 'Words', value: formatNumber(overview.wordCount) }
	]

	return (
		<section className="report-hero" id="overview">
			<div className="report-hero-main">
				<div className="report-hero-text">
					<span className="section-label">
						SEO report · {absoluteDate(report.createdAt)}
					</span>
					<h1>{overview.title || report.domain}</h1>
					<a
						className="report-hero-url mono"
						href={report.finalUrl}
						target="_blank"
						rel="noreferrer"
					>
						{report.finalUrl}
						<Icon name="external" size={13} />
					</a>
					<p className="report-hero-verdict">{verdict(report, issues)}</p>
				</div>
				<GradeRing score={report.score} grade={report.grade} size="lg" />
			</div>
			<dl className="metric-row">
				{metrics.map((metric) => (
					<div key={metric.label} className="metric">
						<dt>{metric.label}</dt>
						<dd className="mono">{metric.value}</dd>
					</div>
				))}
			</dl>
			{overview.technologies.length > 0 && (
				<div className="report-hero-tech">
					<span className="section-label">Built with</span>
					<ul className="tag-list">
						{overview.technologies.map((tech) => (
							<li key={tech.name} className="chip" title={tech.category}>
								{tech.name}
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	)
}

export default memo(ReportHero)
