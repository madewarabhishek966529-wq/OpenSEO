import dns from 'node:dns/promises'
import tls from 'node:tls'
import { isPrivateIp } from './http'

export interface TlsInfo {
	ok: boolean
	error?: string
	/** The protocol the server picked from ours: "h2" means it speaks HTTP/2. */
	alpn?: string | false | null
	protocol?: string | null
	issuer?: string
	subject?: string
	validFrom?: string
	validTo?: string
	daysLeft?: number
	altNames?: number
}

export interface DnsInfo {
	ip?: string
	ipv6?: string
	spf?: string
	dmarc?: string
	mx: string[]
}

/** One TLS handshake tells us about the certificate and whether HTTP/2 is offered. */
export function inspectTls(hostname: string, port = 443, timeoutMs = 8000): Promise<TlsInfo> {
	return new Promise((resolve) => {
		let settled = false
		const socket = tls.connect({
			host: hostname,
			port,
			servername: hostname,
			ALPNProtocols: ['h2', 'http/1.1'],
			rejectUnauthorized: false,
			timeout: timeoutMs
		})
		const finish = (info: TlsInfo): void => {
			if (settled) return
			settled = true
			socket.destroy()
			resolve(info)
		}
		socket.once('secureConnect', () => {
			const cert = socket.getPeerCertificate()
			const validTo = cert?.valid_to ? new Date(cert.valid_to) : undefined
			const issuer = cert?.issuer ? cert.issuer.O || cert.issuer.CN || '' : ''
			finish({
				ok: socket.authorized,
				error: socket.authorized
					? undefined
					: String(socket.authorizationError || 'Certificate not trusted'),
				alpn: socket.alpnProtocol,
				protocol: socket.getProtocol(),
				issuer: Array.isArray(issuer) ? issuer.join(', ') : issuer,
				subject: cert?.subject ? String(cert.subject.CN || '') : undefined,
				validFrom: cert?.valid_from,
				validTo: cert?.valid_to,
				daysLeft: validTo
					? Math.floor((validTo.getTime() - Date.now()) / 86_400_000)
					: undefined,
				altNames: cert?.subjectaltname ? cert.subjectaltname.split(',').length : 0
			})
		})
		socket.once('timeout', () => finish({ ok: false, error: 'The TLS handshake timed out.' }))
		socket.once('error', (e) => finish({ ok: false, error: e.message }))
	})
}

const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query'

/**
 * Asks Cloudflare's DNS over HTTPS. Used when the system resolver has no answer, because some
 * hosts (containers, corporate networks) only resolve A and AAAA records.
 */
async function resolveOverHttps(name: string, type: 'TXT' | 'MX'): Promise<string[]> {
	try {
		const res = await fetch(`${DOH_ENDPOINT}?name=${encodeURIComponent(name)}&type=${type}`, {
			headers: { accept: 'application/dns-json' },
			signal: AbortSignal.timeout(5000)
		})
		const data = (await res.json()) as { Answer?: { type: number; data: string }[] }
		const code = type === 'TXT' ? 16 : 15

		return (data.Answer ?? []).filter((a) => a.type === code).map((a) => a.data)
	} catch {
		return []
	}
}

/** Joins the quoted chunks of a TXT record ("v=spf1 " "include:…") into one string. */
function unquoteTxt(data: string): string {
	const parts = data.match(/"((?:[^"\\]|\\.)*)"/g)

	return parts ? parts.map((p) => p.slice(1, -1)).join('') : data
}

async function txtRecords(name: string): Promise<string[]> {
	try {
		const rows = await dns.resolveTxt(name)

		return rows.map((r) => r.join(''))
	} catch {
		return (await resolveOverHttps(name, 'TXT')).map(unquoteTxt)
	}
}

async function mxRecords(name: string): Promise<string[]> {
	try {
		const rows = await dns.resolveMx(name)

		return rows.sort((a, b) => a.priority - b.priority).map((m) => m.exchange)
	} catch {
		const rows = await resolveOverHttps(name, 'MX')

		return rows
			.map((r) => r.split(' '))
			.sort((a, b) => Number(a[0]) - Number(b[0]))
			.map((r) => (r[1] ?? '').replace(/\.$/, ''))
			.filter(Boolean)
	}
}

/** The site's IP addresses and the email records (SPF, DMARC, MX) of its root domain. */
export async function inspectDns(hostname: string): Promise<DnsInfo> {
	const root = hostname.replace(/^www\./i, '')
	const [v4, v6, rootTxt, dmarcTxt, mx] = await Promise.all([
		dns.resolve4(hostname).catch(() => [] as string[]),
		dns.resolve6(hostname).catch(() => [] as string[]),
		txtRecords(root),
		txtRecords(`_dmarc.${root}`),
		mxRecords(root)
	])

	return {
		ip: v4.find((ip) => !isPrivateIp(ip)) || v4[0],
		ipv6: v6[0],
		spf: rootTxt.find((t) => /^v=spf1/i.test(t)),
		dmarc: dmarcTxt.find((t) => /^v=DMARC1/i.test(t)),
		mx
	}
}
