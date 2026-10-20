'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyState } from '@web/components/empty-state'
import { PageHeader } from '@web/components/page-header'
import { CrawlForm } from './components/crawl-form'
import { CrawlRow } from './components/crawl-row'
import type { CrawlsScreenProps } from './crawls-screen.types'

/** Start a crawl of a whole site, and see the ones run before. */
const CrawlsScreen = (props: CrawlsScreenProps) => {
	const { crawls, pageLimit, now } = props

	const router = useRouter()

	const handleDelete = async (id: string) => {
		await fetch(`/api/crawls/${id}`, { method: 'DELETE' })
		router.refresh()
	}

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Site"
				title="Crawler"
				description="Follows the links on a site, page by page, and finds broken pages, missing titles, duplicates and thin content."
			/>
			<CrawlForm pageLimit={pageLimit} />
			<h2 className="screen-subtitle">Past crawls</h2>
			{crawls.length ? (
				<ul className="crawl-list">
					{crawls.map((crawl) => (
						<CrawlRow key={crawl.id} crawl={crawl} now={now} onDelete={handleDelete} />
					))}
				</ul>
			) : (
				<EmptyState icon="crawl" title="No crawls yet">
					<p>Crawl your site to check every page at once, not just the home page.</p>
				</EmptyState>
			)}
		</div>
	)
}

export default memo(CrawlsScreen)
