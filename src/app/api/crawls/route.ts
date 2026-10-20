import { listCrawls } from '@server/store'

export const dynamic = 'force-dynamic'

/** GET /api/crawls: past crawls, newest first. */
export async function GET(): Promise<Response> {
	return Response.json(await listCrawls())
}
