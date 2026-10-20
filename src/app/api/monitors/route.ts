import { AuditError } from '@server/audit'
import { createMonitor } from '@server/monitors/create'
import { listMonitors } from '@server/store'
import { jsonError } from '@server/stream'

export const dynamic = 'force-dynamic'

/** GET /api/monitors: every monitor with its recent runs, newest first. */
export async function GET(): Promise<Response> {
	return Response.json(await listMonitors())
}

/**
 * POST /api/monitors { url, schedule?, alerts? }: starts watching a page. Without a schedule it
 * runs every day at 06:00 UTC; without alert rules it alerts on a 5-point drop, the page going
 * down and an SSL certificate 14 days before it expires.
 */
export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
	try {
		return Response.json(await createMonitor(body), { status: 201 })
	} catch (e) {
		return jsonError(e instanceof AuditError ? e.message : "That address doesn't work.", 422)
	}
}
