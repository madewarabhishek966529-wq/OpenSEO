import dns from 'node:dns/promises'
import net from 'node:net'

export const USER_AGENT =
	process.env.OPENSEO_USER_AGENT ||
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OpenSEO/0.1'

/** An error whose message is safe to show to the person running the audit. */
export class AuditError extends Error {
	constructor(
		message: string,
		readonly code: string = 'audit_error'
	) {
		super(message)
	}
}

export interface FetchHop {
	url: string
	status: number
}

export interface SafeFetchResult {
	/** The URL that finally answered, after redirects. */
	url: string
	status: number
	ok: boolean
	headers: Headers
	redirects: FetchHop[]
	body: Buffer
	bytes: number
	truncated: boolean
	ttfbMs: number
	totalMs: number
	contentType: string
}

export interface SafeFetchOptions {
	method?: 'GET' | 'HEAD'
	timeoutMs?: number
	maxBytes?: number
	maxRedirects?: number
	readBody?: boolean
	headers?: Record<string, string>
}

const PRIVATE_V4 = [
	'0.0.0.0/8',
	'10.0.0.0/8',
	'100.64.0.0/10',
	'127.0.0.0/8',
	'169.254.0.0/16',
	'172.16.0.0/12',
	'192.0.0.0/24',
	'192.168.0.0/16',
	'198.18.0.0/15',
	'224.0.0.0/4',
	'240.0.0.0/4'
]

function allowPrivate(): boolean {
	return process.env.OPENSEO_ALLOW_PRIVATE === 'true'
}

function ipv4ToInt(ip: string): number {
	return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function inRange(ip: string, cidr: string): boolean {
	const [base, bits] = cidr.split('/')
	const mask = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0

	return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask)
}

/** Loopback, private, link-local, multicast and reserved addresses, in IPv4 or IPv6. */
export function isPrivateIp(ip: string): boolean {
	if (net.isIPv4(ip)) return PRIVATE_V4.some((cidr) => inRange(ip, cidr))
	if (!net.isIPv6(ip)) return true
	const lower = ip.toLowerCase()
	if (lower === '::1' || lower === '::') return true
	const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
	if (mapped) return isPrivateIp(mapped[1])

	// fc00::/7 unique local, fe80::/10 link local, ff00::/8 multicast
	return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith('ff')
}

const hostChecks = new Map<string, Promise<void>>()

/** Headers sent with every request to one host. Set by `pnpm check`; empty in the app. */
const hostHeaders = new Map<string, Record<string, string>>()

/**
 * Sends extra headers with every request to `host`, like the token that lets automation past a
 * protected preview deploy. Only that host gets them, so a secret never leaks to other sites.
 * The setting is global to the process, which suits the CLI but not the app.
 */
export function setHostHeaders(host: string, headers: Record<string, string>): void {
	hostHeaders.set(host.toLowerCase(), headers)
}

/**
 * Refuses hosts that resolve to private addresses, so a public OpenSEO can't be used to reach
 * the network it runs in. Set OPENSEO_ALLOW_PRIVATE=true to audit local sites.
 */
export async function assertPublicHost(hostname: string): Promise<void> {
	if (allowPrivate()) return
	const host = hostname.replace(/^\[|\]$/g, '')
	if (/(^|\.)(localhost|local|internal)$/.test(host)) {
		throw new AuditError(
			`OpenSEO doesn't audit internal hosts like "${hostname}".`,
			'private_host'
		)
	}
	let pending = hostChecks.get(host)
	if (!pending) {
		pending = (async () => {
			const addresses = net.isIP(host)
				? [{ address: host }]
				: await dns.lookup(host, { all: true, verbatim: true })
			if (!addresses.length) throw new AuditError(`Couldn't find ${hostname}.`, 'dns')
			if (addresses.some((a) => isPrivateIp(a.address))) {
				throw new AuditError(
					`OpenSEO doesn't audit ${hostname} because it points to a private address.`,
					'private_host'
				)
			}
		})()
		hostChecks.set(host, pending)
		setTimeout(() => hostChecks.delete(host), 60_000).unref()
	}
	try {
		await pending
	} catch (e) {
		hostChecks.delete(host)
		throw e
	}
}

async function readLimited(
	res: Response,
	maxBytes: number
): Promise<{ body: Buffer; truncated: boolean }> {
	if (!res.body) return { body: Buffer.alloc(0), truncated: false }
	const reader = res.body.getReader()
	const chunks: Buffer[] = []
	let size = 0
	let truncated = false
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength))
		size += value.byteLength
		if (size > maxBytes) {
			truncated = true
			await reader.cancel().catch(() => {})
			break
		}
	}

	return { body: Buffer.concat(chunks), truncated }
}

function describeNetworkError(e: unknown, timeoutMs: number, aborted: boolean): AuditError {
	if (e instanceof AuditError) return e
	if (aborted) {
		return new AuditError(
			`The site didn't answer within ${Math.round(timeoutMs / 1000)} seconds.`,
			'timeout'
		)
	}
	const err = e as Error & { cause?: { code?: string; message?: string } }
	const code = err.cause?.code ?? ''
	if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
		return new AuditError("Couldn't find that domain. Check the spelling.", 'dns')
	}
	if (code === 'ECONNREFUSED')
		return new AuditError('The server refused the connection.', 'refused')
	if (code.startsWith('CERT_') || code.includes('CERT') || code.includes('SELF_SIGNED')) {
		return new AuditError(`The site's SSL certificate isn't valid (${code}).`, 'tls')
	}

	return new AuditError(err.cause?.message || err.message || 'Network error', code || 'network')
}

/**
 * fetch() with a check for private addresses on every redirect hop, a hard timeout, a cap on the
 * body size and timing information.
 */
export async function safeFetch(
	input: string,
	options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
	const {
		method = 'GET',
		timeoutMs = 15_000,
		maxBytes = 5 * 1024 * 1024,
		maxRedirects = 10,
		readBody = true,
		headers = {}
	} = options

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	const start = performance.now()
	const redirects: FetchHop[] = []
	let current = input

	try {
		for (let hop = 0; hop <= maxRedirects; hop++) {
			const url = new URL(current)
			if (url.protocol !== 'http:' && url.protocol !== 'https:') {
				throw new AuditError(`OpenSEO can't open ${url.protocol} links.`, 'protocol')
			}
			await assertPublicHost(url.hostname)
			const hopStart = performance.now()
			const res = await fetch(url, {
				method,
				redirect: 'manual',
				signal: controller.signal,
				headers: {
					'user-agent': USER_AGENT,
					accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'accept-language': 'en-US,en;q=0.9',
					...headers,
					...hostHeaders.get(url.hostname.toLowerCase())
				}
			})
			const ttfb = performance.now() - hopStart
			const location = res.headers.get('location')
			if (res.status >= 300 && res.status < 400 && location) {
				redirects.push({ url: url.toString(), status: res.status })
				await res.body?.cancel().catch(() => {})
				current = new URL(location, url).toString()
				continue
			}
			let read: { body: Buffer; truncated: boolean } = {
				body: Buffer.alloc(0),
				truncated: false
			}
			if (readBody && method !== 'HEAD') read = await readLimited(res, maxBytes)
			else await res.body?.cancel().catch(() => {})
			const { body, truncated } = read

			return {
				url: url.toString(),
				status: res.status,
				ok: res.ok,
				headers: res.headers,
				redirects,
				body,
				bytes: body.byteLength,
				truncated,
				ttfbMs: Math.round(ttfb),
				totalMs: Math.round(performance.now() - start),
				contentType: (res.headers.get('content-type') || '').toLowerCase()
			}
		}
		throw new AuditError('The page redirects too many times.', 'redirects')
	} catch (e) {
		throw describeNetworkError(e, timeoutMs, controller.signal.aborted)
	} finally {
		clearTimeout(timer)
	}
}

/** Decodes a page using the charset from its headers or its <meta charset>. */
export function decodeHtml(body: Buffer, contentType: string): string {
	let charset = contentType
		.match(/charset=([^;]+)/i)?.[1]
		?.trim()
		.replace(/["']/g, '')
	if (!charset) {
		const head = body.subarray(0, 2048).toString('latin1')
		charset = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
	}
	try {
		return new TextDecoder(charset || 'utf-8').decode(body)
	} catch {
		return new TextDecoder('utf-8').decode(body)
	}
}

/** Runs `fn` over `items`, at most `limit` at a time, keeping the order of the results. */
export async function mapLimit<T, R>(
	items: T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results: R[] = new Array(items.length)
	let next = 0
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next++
			results[index] = await fn(items[index], index)
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))

	return results
}

/** Turns what someone typed ("example.com/pricing") into a full URL, or explains what's wrong. */
export function normalizeInputUrl(input: string): string {
	let value = input.trim()
	if (!value) throw new AuditError('Enter a website address to audit.', 'invalid_url')
	if (!/^https?:\/\//i.test(value)) value = `https://${value}`
	let url: URL
	try {
		url = new URL(value)
	} catch {
		throw new AuditError("That doesn't look like a web address.", 'invalid_url')
	}
	if (url.hostname === 'localhost' && !allowPrivate()) {
		throw new AuditError(
			"OpenSEO doesn't audit localhost. Set OPENSEO_ALLOW_PRIVATE=true to allow it.",
			'private_host'
		)
	}
	if (!url.hostname.includes('.') && !allowPrivate()) {
		throw new AuditError("That doesn't look like a domain name.", 'invalid_url')
	}
	url.hash = ''

	return url.toString()
}

export function stripWww(host: string): string {
	return host.replace(/^www\./i, '').toLowerCase()
}
