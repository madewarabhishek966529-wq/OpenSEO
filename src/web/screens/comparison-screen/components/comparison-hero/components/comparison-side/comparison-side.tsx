import { memo } from 'react'
import { displayUrl } from '@shared/format'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { absoluteDate } from '@web/lib/time'
import type { ComparisonSideProps } from './comparison-side.types'

/** One of the two audits: its grade, page and date, with a link to the full report. */
const ComparisonSide = (props: ComparisonSideProps) => {
	const { side } = props

	return (
		<div className="comparison-side">
			<GradeRing score={side.score} grade={side.grade} size="md" />
			<div className="comparison-side-text">
				<span className="chip comparison-side-label">{side.label}</span>
				<strong className="comparison-side-title">{side.title || side.domain}</strong>
				<span className="comparison-side-url mono">{displayUrl(side.finalUrl)}</span>
				<span className="muted">{absoluteDate(side.createdAt)}</span>
				<a className="comparison-side-link" href={`/report/${side.id}`}>
					Open the report
					<Icon name="arrowRight" size={13} />
				</a>
			</div>
		</div>
	)
}

export default memo(ComparisonSide)
