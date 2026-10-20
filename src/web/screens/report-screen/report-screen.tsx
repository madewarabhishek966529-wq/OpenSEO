import { memo } from 'react'
import { ReportFooter } from '@web/components/report-footer'
import { recommendationsOf } from './report-screen.utils'
import { PriorityList } from './components/priority-list'
import { ReportChecks } from './components/report-checks'
import { ReportHero } from './components/report-hero'
import { ReportSidebar } from './components/report-sidebar'
import { ReportTopBar } from './components/report-top-bar'
import { ShareSection } from './components/share-section'
import type { ReportScreenProps } from './report-screen.types'

/** A shareable audit report: grades, what to fix first, then every check by category. */
const ReportScreen = (props: ReportScreenProps) => {
	const { report, settings, linkToWorkspace } = props

	const toFix = recommendationsOf(report.checks)

	return (
		<div className="report-page">
			<ReportTopBar
				report={report}
				brandName={settings.brandName}
				brandLogo={settings.brandLogo}
				linkToWorkspace={linkToWorkspace}
			/>
			<div className="report-window">
				<ReportSidebar report={report} />
				<div className="report-main">
					<ReportHero report={report} issues={toFix.length} />
					<PriorityList checks={toFix} />
					{report.sharing && (
						<ShareSection sharing={report.sharing} url={report.finalUrl} />
					)}
					<ReportChecks report={report} />
					<ReportFooter
						brandName={settings.brandName}
						footer={settings.reportFooter}
						ctaText={settings.ctaText}
						ctaUrl={settings.ctaUrl}
						createdAt={report.createdAt}
					/>
				</div>
			</div>
		</div>
	)
}

export default memo(ReportScreen)
