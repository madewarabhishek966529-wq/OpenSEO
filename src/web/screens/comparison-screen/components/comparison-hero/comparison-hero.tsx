import { memo } from 'react'
import { verdict } from '@shared/compare'
import { Delta } from '@web/components/delta'
import { ComparisonSide } from './components/comparison-side'
import type { ComparisonHeroProps } from './comparison-hero.types'

/** The two audits with their grades, the change in score and one sentence that sums it up. */
const ComparisonHero = (props: ComparisonHeroProps) => {
	const { comparison } = props

	const { a, b, samePage, scoreChange } = comparison

	return (
		<section className="report-hero comparison-hero" id="overview">
			<div className="report-hero-text">
				<span className="section-label">
					{samePage ? 'Before and after' : 'Side by side'}
				</span>
				<h1>{samePage ? b.title || b.domain : `${a.label} vs ${b.label}`}</h1>
				<p className="report-hero-verdict">{verdict(comparison)}</p>
			</div>
			<div className="comparison-sides">
				<ComparisonSide side={a} />
				<div className="comparison-delta">
					<Delta change={scoreChange} better={samePage ? 'higher' : null} size="lg" />
					<span className="muted">points</span>
				</div>
				<ComparisonSide side={b} />
			</div>
		</section>
	)
}

export default memo(ComparisonHero)
