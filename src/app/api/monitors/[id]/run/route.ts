import { isRunning, runMonitor } from '@server/monitors/run'
import { getMonitor } from '@server/store'
import { jsonError, streamEvents } from '@server/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/monitors/:id/run: runs a monitor now, alerts included. Streams progress like audits
 * and ends with { type: "done", id } for the new report, or an error when the page didn't load.
 */
export async function POST(
	_request: Request,
	context: RouteContext<'/api/monitors/[id]/run'>
): Promise<Response> {
	const { id } = await context.params
	if (!(await getMonitor(id))) return jsonError('Monitor not found.', 404)
	if (isRunning(id)) return jsonError('This monitor is running already.', 409)

	return streamEvents(async (send) => {
		send({ type: 'progress', step: 'queued', label: 'Starting the audit', pct: 1 })
		const run = await runMonitor(id, {
			manual: true,
			onProgress: (p) => send({ type: 'progress', ...p })
		})
		if (!run) throw new Error('The monitor was deleted.')
		if (!run.ok || !run.reportId) throw new Error(run.error ?? "The page didn't load.")
		send({ type: 'done', id: run.reportId, score: run.score ?? 0, grade: run.grade ?? '' })
	})
}
