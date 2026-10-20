'use client'

import { memo, useState } from 'react'
import { formatCount, formatMs } from '@shared/format'
import { gradeFor } from '@shared/grades'
import { CRAWL_ISSUES } from '@shared/crawl-issues'
import { Button } from '@web/components/button'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import { absoluteDate } from '@web/lib/time'
import { IssueItem } from './components/issue-item'
import { PageTable } from './components/page-table'
import type { CrawlReportScreenProps, PageFilter } from './crawl-report-screen.types'

/** A finished crawl: site health, issues by how much they matter, and every page. */
const CrawlReportScreen = (props: CrawlReportScreenProps) => {
	const { crawl } = props

	const [filter, setFilter] = useState<PageFilter>('all')
	const pages =
		filter === 'all' ? crawl.pages : crawl.pages.filter((p) => p.issues.includes(filter))
	const timed = crawl.pages.filter((p) => p.responseMs)
	const averageMs = timed.length
		? timed.reduce((n, p) => n + (p.responseMs ?? 0), 0) / timed.length
		: 0
	const broken = crawl.pages.filter((p) => p.status === null || p.status >= 400).length

	return (
		<div className="screen">
			<PageHeader
				eyebrow={`Crawl · ${absoluteDate(crawl.createdAt)}`}
				title={crawl.domain}
				description={
					crawl.limitReached
						? `Stopped at the ${crawl.maxPages}-page limit. Raise it in Settings to crawl more.`
						: `Crawled every page we could reach from ${crawl.startUrl}.`
				}
				actions={
					<a className="button" href={`/api/crawls/${crawl.id}?format=csv`} download>
						<Icon name="download" size={15} />
						Export CSV
					</a>
				}
			/>
			<div className="crawl-summary">
				<GradeRing score={crawl.health} grade={gradeFor(crawl.health)} size="md" />
				<dl className="metric-row">
					<div className="metric">
						<dt>Site health</dt>
						<dd className="mono">{crawl.health}%</dd>
					</div>
					<div className="metric">
						<dt>Pages crawled</dt>
						<dd className="mono">{crawl.pages.length}</dd>
					</div>
					<div className="metric">
						<dt>Broken pages</dt>
						<dd className="mono">{broken}</dd>
					</div>
					<div className="metric">
						<dt>Average response</dt>
						<dd className="mono">{formatMs(averageMs)}</dd>
					</div>
				</dl>
			</div>
			<div className="crawl-layout">
				<section className="crawl-issues" aria-labelledby="issues-title">
					<h2 id="issues-title" className="screen-subtitle">
						Issues
					</h2>
					{crawl.issues.length ? (
						<ul className="issue-list">
							{crawl.issues.map((issue) => (
								<IssueItem
									key={issue.id}
									issue={issue}
									fix={CRAWL_ISSUES[issue.id].fix}
									selected={filter === issue.id}
									onSelect={setFilter}
								/>
							))}
						</ul>
					) : (
						<p className="muted">No issues found. Nice.</p>
					)}
				</section>
				<section className="crawl-pages" aria-labelledby="pages-title">
					<div className="crawl-pages-head">
						<h2 id="pages-title" className="screen-subtitle">
							{filter === 'all' ? 'All pages' : CRAWL_ISSUES[filter].title}
						</h2>
						<span className="muted">{formatCount(pages.length, 'page')}</span>
						{filter !== 'all' && (
							<Button small variant="quiet" onClick={() => setFilter('all')}>
								<Icon name="close" size={14} />
								Show all
							</Button>
						)}
					</div>
					<PageTable pages={pages} />
				</section>
			</div>
		</div>
	)
}

export default memo(CrawlReportScreen)
