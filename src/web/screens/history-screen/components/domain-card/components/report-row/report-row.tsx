'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { displayUrl } from '@shared/format'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import { relativeTime } from '@web/lib/time'
import { SOURCE_LABELS } from './report-row.constants'
import type { ReportRowProps } from './report-row.types'

const ReportRow = (props: ReportRowProps) => {
	const { report, now, onDelete } = props

	const [confirming, setConfirming] = useState(false)

	return (
		<li className="report-row">
			<Link className="report-row-link" href={`/report/${report.id}`}>
				<span className="report-row-grade mono">{report.grade}</span>
				<span className="report-row-score mono muted">{report.score}</span>
				<span className="report-row-url mono">{displayUrl(report.finalUrl)}</span>
				<span className="chip">{SOURCE_LABELS[report.source]}</span>
				<span className="report-row-time muted">{relativeTime(report.createdAt, now)}</span>
			</Link>
			{confirming ? (
				<span className="report-row-confirm">
					<Button small variant="quiet" onClick={() => setConfirming(false)}>
						Cancel
					</Button>
					<Button small variant="danger" onClick={() => onDelete(report.id)}>
						Delete
					</Button>
				</span>
			) : (
				<Button
					variant="icon"
					aria-label="Delete this report"
					title="Delete"
					onClick={() => setConfirming(true)}
				>
					<Icon name="trash" size={15} />
				</Button>
			)}
		</li>
	)
}

export default memo(ReportRow)
