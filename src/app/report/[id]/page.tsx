import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicSettings } from '@server/settings'
import { getReport } from '@server/store'
import { ReportScreen } from '@web/screens/report-screen'

export async function generateMetadata(props: PageProps<'/report/[id]'>): Promise<Metadata> {
	const { params } = props

	const report = await getReport((await params).id)
	if (!report) return { title: 'Report not found' }

	return {
		title: `${report.domain} SEO report: ${report.grade}`,
		description: `${report.domain} scored ${report.score}/100 across on-page SEO, performance, usability, security, links, social and AI search.`,
		robots: { index: false }
	}
}

const ReportPage = async (props: PageProps<'/report/[id]'>) => {
	const { params } = props

	const [report, settings] = await Promise.all([
		getReport((await params).id),
		getPublicSettings()
	])
	if (!report) notFound()

	return (
		<ReportScreen
			report={report}
			settings={settings}
			linkToWorkspace={!process.env.ADMIN_PASSWORD}
		/>
	)
}

export default ReportPage
