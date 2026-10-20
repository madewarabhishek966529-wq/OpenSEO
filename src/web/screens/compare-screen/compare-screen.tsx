'use client'

import { memo, useState, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import { PairRow } from './components/pair-row'
import { ReportSlot } from './components/report-slot'
import type { CompareScreenProps } from './compare-screen.types'
import { suggestedPairs } from './compare-screen.utils'

/** Pick two audits, from history or run on the spot, and open them side by side. */
const CompareScreen = (props: CompareScreenProps) => {
	const { reports, initialA, initialB, now } = props

	const router = useRouter()
	const [a, setA] = useState(initialA)
	const [b, setB] = useState(initialB)
	const pairs = suggestedPairs(reports)

	const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (a && b && a !== b) router.push(`/report/${a}/compare/${b}`)
	}

	const handleSwapClick = () => {
		setA(b)
		setB(a)
	}

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Audit"
				title="Compare"
				description="Put two audits side by side: the same page before and after a change, or your page next to a competitor's."
			/>
			<form className="panel-form compare-form" onSubmit={handleSubmit}>
				<div className="compare-slots">
					<ReportSlot
						label="First audit"
						placeholder="yourwebsite.com"
						reports={reports}
						value={a}
						other={b}
						now={now}
						onChange={setA}
					/>
					<Button
						variant="icon"
						className="compare-swap"
						aria-label="Swap the two audits"
						title="Swap"
						disabled={!a && !b}
						onClick={handleSwapClick}
					>
						<Icon name="swap" size={16} />
					</Button>
					<ReportSlot
						label="Second audit"
						placeholder="competitor.com"
						reports={reports}
						value={b}
						other={a}
						now={now}
						onChange={setB}
					/>
				</div>
				<div className="compare-form-footer">
					<span className="muted">
						Two audits of the same page are shown in time order, as before and after.
					</span>
					<Button type="submit" variant="primary" disabled={!a || !b || a === b}>
						Compare
						<Icon name="arrowRight" size={15} />
					</Button>
				</div>
			</form>
			{pairs.length > 0 && (
				<>
					<h2 className="screen-subtitle">Before and after</h2>
					<p className="muted">
						The two latest audits of each page you audited more than once.
					</p>
					<ul className="crawl-list">
						{pairs.map((pair) => (
							<PairRow key={pair.newer.id} pair={pair} now={now} />
						))}
					</ul>
				</>
			)}
		</div>
	)
}

export default memo(CompareScreen)
