'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { formatCount } from '@shared/format'
import { gradeFor } from '@shared/grades'
import { Button } from '@web/components/button'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { relativeTime } from '@web/lib/time'
import type { CrawlRowProps } from './crawl-row.types'

const CrawlRow = (props: CrawlRowProps) => {
	const { crawl, now, onDelete } = props

	const [confirming, setConfirming] = useState(false)

	return (
		<li className="crawl-row">
			<Link className="crawl-row-link" href={`/crawls/${crawl.id}`}>
				<GradeRing score={crawl.health} grade={gradeFor(crawl.health)} size="sm" />
				<span className="crawl-row-text">
					<strong>{crawl.domain}</strong>
					<span className="muted">
						{formatCount(crawl.pages, 'page')} · {formatCount(crawl.issues, 'issue')} ·{' '}
						{crawl.health}% healthy
					</span>
				</span>
				<span className="muted crawl-row-time">{relativeTime(crawl.createdAt, now)}</span>
			</Link>
			{confirming ? (
				<span className="report-row-confirm">
					<Button small variant="quiet" onClick={() => setConfirming(false)}>
						Cancel
					</Button>
					<Button small variant="danger" onClick={() => onDelete(crawl.id)}>
						Delete
					</Button>
				</span>
			) : (
				<Button
					variant="icon"
					aria-label="Delete this crawl"
					title="Delete"
					onClick={() => setConfirming(true)}
				>
					<Icon name="trash" size={15} />
				</Button>
			)}
		</li>
	)
}

export default memo(CrawlRow)
