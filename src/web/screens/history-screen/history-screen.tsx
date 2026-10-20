'use client'

import { memo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCount } from '@shared/format'
import { EmptyState } from '@web/components/empty-state'
import { Icon } from '@web/components/icon'
import { Input } from '@web/components/input'
import { PageHeader } from '@web/components/page-header'
import { DomainCard } from './components/domain-card'
import type { HistoryScreenProps } from './history-screen.types'
import { groupByDomain } from './history-screen.utils'

/** Every audit so far, grouped by site, with each site's score over time. */
const HistoryScreen = (props: HistoryScreenProps) => {
	const { reports, now } = props

	const router = useRouter()
	const [query, setQuery] = useState('')
	const needle = query.trim().toLowerCase()
	const domains = groupByDomain(
		needle
			? reports.filter(
					(r) => r.domain.includes(needle) || r.title.toLowerCase().includes(needle)
				)
			: reports
	)

	const handleDelete = async (id: string) => {
		await fetch(`/api/reports/${id}`, { method: 'DELETE' })
		router.refresh()
	}

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Audit"
				title="History"
				description={`${formatCount(reports.length, 'audit')} across ${formatCount(groupByDomain(reports).length, 'site')}.`}
				actions={
					reports.length > 0 && (
						<label className="search-field">
							<Icon name="search" size={16} />
							<Input
								type="search"
								placeholder="Filter by site"
								aria-label="Filter by site"
								value={query}
								onChange={(e) => setQuery(e.currentTarget.value)}
							/>
						</label>
					)
				}
			/>
			{!reports.length && (
				<EmptyState icon="clock" title="No audits yet">
					<p>
						Audits you run show up here, grouped by site, so you can see scores change
						over time.
					</p>
				</EmptyState>
			)}
			<div className="domain-grid">
				{domains.map((group) => (
					<DomainCard
						key={group.domain}
						history={group}
						now={now}
						onDelete={handleDelete}
					/>
				))}
			</div>
		</div>
	)
}

export default memo(HistoryScreen)
