import { sendAlert, testMessage } from '@server/notify'
import { appUrl } from '@server/settings'
import { getSettings } from '@server/store'
import { jsonError } from '@server/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST /api/alerts/test: sends a test alert to every channel in Settings and says how each went. */
export async function POST(): Promise<Response> {
	const settings = await getSettings()
	const deliveries = await sendAlert(testMessage(appUrl(settings)), settings)
	if (!deliveries.length) {
		return jsonError('Add an email address, Slack, Discord or a webhook first.', 422)
	}

	return Response.json({ deliveries })
}
