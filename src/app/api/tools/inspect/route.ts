import { normalizeInputUrl, safeFetch } from '@server/audit/http'
import { jsonError } from '@server/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request): Promise<Response> {
	const rawUrl = new URL(request.url).searchParams.get('url') ?? ''
	if (!rawUrl.trim()) {
		return jsonError('Please provide a URL to inspect', 400)
	}

	try {
		const targetUrl = normalizeInputUrl(rawUrl)
		const start = performance.now()
		const res = await safeFetch(targetUrl, {
			timeoutMs: 15000,
			maxBytes: 1024 * 1024,
			readBody: false
		})
		const elapsedMs = Math.round(performance.now() - start)

		const headersList: { name: string; value: string; isSecurity?: boolean }[] = []
		const securityHeaderKeys = new Set([
			'strict-transport-security',
			'content-security-policy',
			'x-frame-options',
			'x-content-type-options',
			'referrer-policy',
			'permissions-policy',
			'cross-origin-opener-policy',
			'cross-origin-embedder-policy',
			'cross-origin-resource-policy'
		])

		for (const [key, value] of res.headers.entries()) {
			headersList.push({
				name: key,
				value,
				isSecurity: securityHeaderKeys.has(key.toLowerCase())
			})
		}

		headersList.sort((a, b) => {
			if (a.isSecurity && !b.isSecurity) return -1
			if (!a.isSecurity && b.isSecurity) return 1
			return a.name.localeCompare(b.name)
		})

		const isHttps = res.url.startsWith('https://')
		const securityScore = headersList.filter((h) => h.isSecurity).length

		return Response.json({
			finalUrl: res.url,
			status: res.status,
			statusText: res.status === 200 ? 'OK' : `${res.status}`,
			totalMs: res.totalMs || elapsedMs,
			ttfbMs: res.ttfbMs,
			contentType: res.contentType,
			isHttps,
			redirectHops: res.redirects,
			headers: headersList,
			securityScore,
			protocol: isHttps ? 'TLS / HTTPS' : 'Plain HTTP'
		})
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to inspect URL'
		return jsonError(message, 400)
	}
}
