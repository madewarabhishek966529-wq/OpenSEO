import { deleteReport, getReport } from '@server/store'
import { jsonError } from '@server/stream'

export const dynamic = 'force-dynamic'

/** GET /api/reports/:id: one report as JSON. Reports are shareable, so this is public. */
export async function GET(
	_request: Request,
	context: RouteContext<'/api/reports/[id]'>
): Promise<Response> {
	const { id } = await context.params
	const report = await getReport(id)
	if (!report) return jsonError('Report not found.', 404)

	return Response.json(report, {
		headers: { 'content-disposition': `inline; filename="openseo-${report.domain}-${id}.json"` }
	})
}

export async function DELETE(
	_request: Request,
	context: RouteContext<'/api/reports/[id]'>
): Promise<Response> {
	const { id } = await context.params
	const deleted = await deleteReport(id)

	return deleted ? new Response(null, { status: 204 }) : jsonError('Report not found.', 404)
}
