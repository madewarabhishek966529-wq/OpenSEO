import { clientIp } from '@server/limits'
import { previewForVisitor } from '@server/share-preview'
import { jsonError } from '@server/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/preview?url=example.com
 *
 * How the page looks when shared on Google, Facebook, X, LinkedIn, Slack, Discord, WhatsApp
 * and iMessage, plus its share images, icons and tags. Takes a few seconds.
 */
export async function GET(request: Request): Promise<Response> {
	const url = new URL(request.url).searchParams.get('url') ?? ''
	const outcome = await previewForVisitor(url, clientIp(request))
	if ('error' in outcome) return jsonError(outcome.error, outcome.status)

	return Response.json(outcome.result)
}
