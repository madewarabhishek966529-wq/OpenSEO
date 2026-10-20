import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCrawl } from '@server/store'
import { CrawlReportScreen } from '@web/screens/crawl-report-screen'

export const metadata: Metadata = { title: 'Crawl', robots: { index: false } }

const CrawlPage = async (props: PageProps<'/crawls/[id]'>) => {
	const { params } = props

	const crawl = await getCrawl((await params).id)
	if (!crawl) notFound()

	return <CrawlReportScreen crawl={crawl} />
}

export default CrawlPage
