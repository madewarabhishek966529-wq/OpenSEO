import { NextResponse, type NextRequest } from 'next/server'

/**
 * Pages and endpoints anyone may use: the audit and preview tools, and shared reports and
 * comparisons (`/report/<id>` and `/report/<id>/compare/<id>`).
 */
function isPublic(request: NextRequest): boolean {
	const { pathname } = request.nextUrl
	if (['/', '/preview'].includes(pathname) || pathname.startsWith('/report/')) return true
	if (pathname === '/api/audit' || pathname === '/api/preview') return true

	return (
		request.method === 'GET' &&
		(/^\/api\/reports\/[^/]+$/.test(pathname) || pathname === '/api/compare')
	)
}

/**
 * Endpoints that act for the admin. A page on another site can make a visitor's browser POST plain
 * text or a form, but not JSON, so these only take JSON.
 */
const JSON_ONLY = /^\/api\/(monitors|alerts|mcp)(\/|$)/

/**
 * With ADMIN_PASSWORD set, history, crawls and settings ask for a password (user "admin").
 * Without it everything is open, which is fine on your own computer.
 */
export function proxy(request: NextRequest): NextResponse {
	const json = request.headers.get('content-type')?.includes('application/json')
	if (request.method === 'POST' && JSON_ONLY.test(request.nextUrl.pathname) && !json) {
		return NextResponse.json(
			{ error: 'Send JSON, with Content-Type: application/json.' },
			{ status: 415 }
		)
	}
	const password = process.env.ADMIN_PASSWORD
	if (!password || isPublic(request)) return NextResponse.next()
	const header = request.headers.get('authorization') ?? ''
	const [scheme, encoded] = header.split(' ')
	if (scheme === 'Basic' && encoded && atob(encoded) === `admin:${password}`) {
		return NextResponse.next()
	}

	return new NextResponse('Sign in to manage OpenSEO.', {
		status: 401,
		headers: { 'www-authenticate': 'Basic realm="OpenSEO admin", charset="UTF-8"' }
	})
}

export const config = {
	matcher: ['/((?!_next/|favicon.ico|icon.svg).*)']
}
