import { listReports } from '@server/store'

export const dynamic = 'force-dynamic'

/** GET /api/reports?domain=example.com: the audit history, newest first. */
export async function GET(request: Request): Promise<Response> {
	const domain = new URL(request.url).searchParams.get('domain')
	const reports = await listReports()

	return Response.json(domain ? reports.filter((r) => r.domain === domain) : reports)
}
