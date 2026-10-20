import { getReport } from '@server/store'
import { jsonError } from '@server/stream'
import { compareReports } from '@shared/compare'

export const dynamic = 'force-dynamic'

/**
 * GET /api/compare?a=<id>&b=<id>: how report B differs from report A, check by check. Two audits
 * of the same page come back in time order. Public, like the reports themselves.
 */
export async function GET(request: Request): Promise<Response> {
	const params = new URL(request.url).searchParams
	const [a, b] = await Promise.all([
		getReport(params.get('a') ?? ''),
		getReport(params.get('b') ?? '')
	])
	if (!a || !b) return jsonError(`Report ${a ? 'b' : 'a'} not found.`, 404)

	return Response.json(compareReports(a, b))
}
