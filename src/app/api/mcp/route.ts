import { handleMcpPost } from '@server/mcp/http'
import { SERVER, TOOLS } from '@server/mcp/tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 800

/**
 * POST /api/mcp: the MCP server, for Claude, Cursor and other AI tools (Streamable HTTP, no
 * sessions). Tools audit pages, read and compare reports, crawl sites, check share previews and
 * manage monitors. Behind ADMIN_PASSWORD like the rest of the API.
 */
export function POST(request: Request): Promise<Response> {
	return handleMcpPost(request, SERVER, TOOLS)
}

/** The server never starts a stream of its own, and keeps no sessions to end. */
function notAllowed(): Response {
	return new Response('This MCP server only answers POST requests.', {
		status: 405,
		headers: { allow: 'POST' }
	})
}

export function GET(): Response {
	return notAllowed()
}

export function DELETE(): Response {
	return notAllowed()
}
