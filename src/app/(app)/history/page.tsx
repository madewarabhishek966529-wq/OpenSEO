import type { Metadata } from 'next'
import { listReports } from '@server/store'
import { HistoryScreen } from '@web/screens/history-screen'

export const metadata: Metadata = { title: 'History' }

const HistoryPage = async () => {
	const reports = await listReports()

	return <HistoryScreen reports={reports} now={Date.now()} />
}

export default HistoryPage
