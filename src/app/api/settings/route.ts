import { toPublicSettings } from '@server/settings'
import { getSettings, updateSettings } from '@server/store'

export const dynamic = 'force-dynamic'

/** GET /api/settings: settings without the PageSpeed API key. */
export async function GET(): Promise<Response> {
	return Response.json(toPublicSettings(await getSettings()))
}

/** PUT /api/settings { …changes }: saves the valid fields and returns the result. */
export async function PUT(request: Request): Promise<Response> {
	const patch = await request.json().catch(() => ({}))

	return Response.json(toPublicSettings(await updateSettings(patch)))
}
