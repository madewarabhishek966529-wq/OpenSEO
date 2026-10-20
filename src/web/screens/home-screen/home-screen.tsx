import { memo } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@shared/grades'
import { CategoryTile } from '@web/components/category-tile'
import { AuditForm } from './components/audit-form'
import { RecentAudits } from './components/recent-audits'
import type { HomeScreenProps } from './home-screen.types'

const HomeScreen = (props: HomeScreenProps) => {
	const { recent, now, pagespeedEnabled } = props

	return (
		<div className="home">
			<section className="home-hero">
				<span className="eyebrow">Open source · 70 checks · No paid APIs</span>
				<h1>
					Find what&apos;s <span className="highlight">holding your site</span> back
				</h1>
				<p className="home-lede">
					Paste a URL. OpenSEO grades on-page SEO, speed, links, mobile, security and AI
					search readiness, then tells you what to fix first.
				</p>
				<AuditForm pagespeedEnabled={pagespeedEnabled} />
			</section>

			<section className="home-section" aria-labelledby="checks-title">
				<div className="home-section-head">
					<h2 id="checks-title">Seven areas, one grade</h2>
					<p className="muted">
						Each area gets its own score, weighted by how much it matters for search.
					</p>
				</div>
				<ul className="category-grid">
					{CATEGORIES.map((category) => (
						<li key={category.id} className="category-card">
							<CategoryTile category={category.id} size={32} />
							<div>
								<h3>{category.name}</h3>
								<p>{category.description}</p>
							</div>
							<span className="category-card-weight mono">{category.weight}%</span>
						</li>
					))}
				</ul>
			</section>

			{recent.length > 0 && (
				<section className="home-section" aria-labelledby="recent-title">
					<div className="home-section-head home-section-head--row">
						<h2 id="recent-title">Recent audits</h2>
						<Link className="button button--quiet button--small" href="/history">
							See all
						</Link>
					</div>
					<RecentAudits reports={recent} now={now} />
				</section>
			)}
		</div>
	)
}

export default memo(HomeScreen)
