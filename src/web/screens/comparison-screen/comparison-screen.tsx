import { memo } from 'react'
import { ReportFooter } from '@web/components/report-footer'
import { CategoryTable } from './components/category-table'
import { CheckChanges } from './components/check-changes'
import { ComparisonHero } from './components/comparison-hero'
import { ComparisonTopBar } from './components/comparison-top-bar'
import { MetricTable } from './components/metric-table'
import type { ComparisonScreenProps } from './comparison-screen.types'

/** Two audits side by side: the scores, each category, the page metrics and every check that changed. */
const ComparisonScreen = (props: ComparisonScreenProps) => {
	const { comparison, settings, linkToWorkspace } = props

	const { a, b } = comparison

	return (
		<div className="report-page comparison-page">
			<ComparisonTopBar
				comparison={comparison}
				brandName={settings.brandName}
				brandLogo={settings.brandLogo}
				linkToWorkspace={linkToWorkspace}
			/>
			<div className="comparison-main">
				<ComparisonHero comparison={comparison} />
				<div className="comparison-grid">
					<CategoryTable comparison={comparison} />
					<MetricTable comparison={comparison} />
				</div>
				<CheckChanges comparison={comparison} />
				<ReportFooter
					brandName={settings.brandName}
					footer={settings.reportFooter}
					ctaText={settings.ctaText}
					ctaUrl={settings.ctaUrl}
					createdAt={a.createdAt > b.createdAt ? a.createdAt : b.createdAt}
				/>
			</div>
		</div>
	)
}

export default memo(ComparisonScreen)
