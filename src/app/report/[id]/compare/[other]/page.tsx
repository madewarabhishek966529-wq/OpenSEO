import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicSettings } from '@server/settings'
import { getReport } from '@server/store'
import { compareReports } from '@shared/compare'
import { ComparisonScreen } from '@web/screens/comparison-screen'

async function load(params: PageProps<'/report/[id]/compare/[other]'>['params']) {
	const { id, other } = await params
	const [a, b] = await Promise.all([getReport(id), getReport(other)])

	return a && b ? compareReports(a, b) : null
}

export async function generateMetadata(
	props: PageProps<'/report/[id]/compare/[other]'>
): Promise<Metadata> {
	const { params } = props

	const comparison = await load(params)
	if (!comparison) return { title: 'Comparison not found' }
	const { a, b, samePage } = comparison

	return {
		title: samePage ? `${b.domain} before and after` : `${a.label} vs ${b.label}`,
		description: `${a.label} scored ${a.score}/100 and ${b.label} ${b.score}/100.`,
		robots: { index: false }
	}
}

const ComparisonPage = async (props: PageProps<'/report/[id]/compare/[other]'>) => {
	const { params } = props

	const [comparison, settings] = await Promise.all([load(params), getPublicSettings()])
	if (!comparison) notFound()

	return (
		<ComparisonScreen
			comparison={comparison}
			settings={settings}
			linkToWorkspace={!process.env.ADMIN_PASSWORD}
		/>
	)
}

export default ComparisonPage
