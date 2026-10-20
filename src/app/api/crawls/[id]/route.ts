import { csvResponse } from '@server/csv'
import { deleteCrawl, getCrawl } from '@server/store'
import { jsonError } from '@server/stream'
import { CRAWL_ISSUES } from '@shared/crawl-issues'

export const dynamic = 'force-dynamic'

/** GET /api/crawls/:id, or ?format=csv for one row per page. */
export async function GET(
	request: Request,
	context: RouteContext<'/api/crawls/[id]'>
): Promise<Response> {
	const { id } = await context.params
	const crawl = await getCrawl(id)
	if (!crawl) return jsonError('Crawl not found.', 404)
	if (new URL(request.url).searchParams.get('format') !== 'csv') return Response.json(crawl)

	return csvResponse(
		`openseo-crawl-${crawl.domain}.csv`,
		['URL', 'Status', 'Response ms', 'Title', 'Description', 'H1', 'Words', 'Depth', 'Issues'],
		crawl.pages.map((p) => [
			p.url,
			p.status ?? p.error ?? '',
			p.responseMs ?? '',
			p.title ?? '',
			p.description ?? '',
			p.h1 ?? '',
			p.wordCount ?? '',
			p.depth,
			p.issues.map((i) => CRAWL_ISSUES[i].title).join('; ')
		])
	)
}

export async function DELETE(
	_request: Request,
	context: RouteContext<'/api/crawls/[id]'>
): Promise<Response> {
	const { id } = await context.params
	const deleted = await deleteCrawl(id)

	return deleted ? new Response(null, { status: 204 }) : jsonError('Crawl not found.', 404)
}
