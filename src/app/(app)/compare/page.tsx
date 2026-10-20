import type { Metadata } from 'next'
import { listReports } from '@server/store'
import { CompareScreen } from '@web/screens/compare-screen'

export const metadata: Metadata = { title: 'Compare' }

const ComparePage = async (props: PageProps<'/compare'>) => {
	const { searchParams } = props

	const [{ a, b }, reports] = await Promise.all([searchParams, listReports()])
	const known = (id: unknown) =>
		typeof id === 'string' && reports.some((r) => r.id === id) ? id : null

	return (
		<CompareScreen reports={reports} initialA={known(a)} initialB={known(b)} now={Date.now()} />
	)
}

export default ComparePage
