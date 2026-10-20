import { runCrawl } from '@server/crawl'
import { clientIp, takeRateLimit, withSlot } from '@server/limits'
import { getSettings, saveCrawl } from '@server/store'
import { jsonError, streamEvents } from '@server/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 800

/** POST /api/crawl { url, maxPages? }: streams progress, then { type: "done", id }. */
export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	const url = typeof body.url === 'string' ? body.url : ''
	const settings = await getSettings()
	const requested = typeof body.maxPages === 'number' ? body.maxPages : settings.crawlPageLimit

	if (!url.trim()) return jsonError('Enter a website address to crawl.', 400)
	if (!takeRateLimit(`crawl:${clientIp(request)}`)) {
		return jsonError("You've run a lot of crawls. Try again in an hour.", 429)
	}

	return streamEvents(async (send) => {
		send({ type: 'progress', step: 'queued', label: 'Starting the crawl', pct: 1 })
		const crawl = await withSlot(() =>
			runCrawl(url, {
				maxPages: Math.min(requested, settings.crawlPageLimit),
				onProgress: (p) => send({ type: 'progress', ...p })
			})
		)
		await saveCrawl(crawl)
		send({ type: 'done', id: crawl.id, score: crawl.health, grade: '' })
	})
}
