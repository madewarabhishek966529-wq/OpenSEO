import { deleteMonitor, getMonitor, updateMonitor } from '@server/store'
import { jsonError } from '@server/stream'
import { mergeAlertRules, mergeSchedule, nextRunAt } from '@shared/monitors'

export const dynamic = 'force-dynamic'

/** GET /api/monitors/:id: one monitor and its recent runs. */
export async function GET(
	_request: Request,
	context: RouteContext<'/api/monitors/[id]'>
): Promise<Response> {
	const { id } = await context.params
	const monitor = await getMonitor(id)

	return monitor ? Response.json(monitor) : jsonError('Monitor not found.', 404)
}

/**
 * PATCH /api/monitors/:id { paused?, schedule?, alerts? }: changes a monitor and returns it. A new
 * schedule, or resuming a paused monitor, counts the next run from now.
 */
export async function PATCH(
	request: Request,
	context: RouteContext<'/api/monitors/[id]'>
): Promise<Response> {
	const { id } = await context.params
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	const updated = await updateMonitor(id, (monitor) => {
		const schedule = mergeSchedule(monitor.schedule, body.schedule)
		const paused = typeof body.paused === 'boolean' ? body.paused : monitor.paused
		const rescheduled =
			JSON.stringify(schedule) !== JSON.stringify(monitor.schedule) ||
			(monitor.paused && !paused)

		return {
			...monitor,
			paused,
			schedule,
			alerts: mergeAlertRules(monitor.alerts, body.alerts),
			nextRunAt: rescheduled
				? nextRunAt(schedule, new Date()).toISOString()
				: monitor.nextRunAt
		}
	})

	return updated ? Response.json(updated) : jsonError('Monitor not found.', 404)
}

/** DELETE /api/monitors/:id: stops monitoring. Its reports stay in History. */
export async function DELETE(
	_request: Request,
	context: RouteContext<'/api/monitors/[id]'>
): Promise<Response> {
	const { id } = await context.params
	const deleted = await deleteMonitor(id)

	return deleted ? new Response(null, { status: 204 }) : jsonError('Monitor not found.', 404)
}
