import type { Metadata } from 'next'
import { getSettings, listCrawls } from '@server/store'
import { CrawlsScreen } from '@web/screens/crawls-screen'

export const metadata: Metadata = { title: 'Crawler' }

const CrawlsPage = async () => {
	const [crawls, settings] = await Promise.all([listCrawls(), getSettings()])

	return <CrawlsScreen crawls={crawls} pageLimit={settings.crawlPageLimit} now={Date.now()} />
}

export default CrawlsPage
