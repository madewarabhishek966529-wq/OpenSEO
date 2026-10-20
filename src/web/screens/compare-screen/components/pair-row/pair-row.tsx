import { memo } from 'react'
import Link from 'next/link'
import { displayUrl } from '@shared/format'
import { Delta } from '@web/components/delta'
import { GradeRing } from '@web/components/grade-ring'
import { relativeTime } from '@web/lib/time'
import type { PairRowProps } from './pair-row.types'

/** A page's latest two audits, linking to their comparison. */
const PairRow = (props: PairRowProps) => {
	const { pair, now } = props

	const { older, newer } = pair

	return (
		<li className="crawl-row">
			<Link className="crawl-row-link" href={`/report/${older.id}/compare/${newer.id}`}>
				<GradeRing score={newer.score} grade={newer.grade} size="sm" />
				<span className="crawl-row-text">
					<strong className="mono">{displayUrl(newer.finalUrl)}</strong>
					<span className="muted">
						{older.grade} {older.score} → {newer.grade} {newer.score}
					</span>
				</span>
				<Delta change={newer.score - older.score} />
				<span className="muted crawl-row-time">{relativeTime(newer.createdAt, now)}</span>
			</Link>
		</li>
	)
}

export default memo(PairRow)
