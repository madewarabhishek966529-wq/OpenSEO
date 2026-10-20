import type { AuditContext } from '@server/audit/context'
import { formatCount } from '@shared/format'
import type { CheckResult, Detail } from '@shared/types'
import { inCategory, listDetail, tableDetail } from './check'

const check = inCategory('security')

const SECURITY_HEADERS: [string, string][] = [
	['content-security-policy', 'Content-Security-Policy'],
	['x-content-type-options', 'X-Content-Type-Options'],
	['x-frame-options', 'X-Frame-Options'],
	['referrer-policy', 'Referrer-Policy'],
	['permissions-policy', 'Permissions-Policy']
]

function httpsCheck(ctx: AuditContext): CheckResult {
	const base = { id: 'https', title: 'HTTPS', weight: 3, priority: 'high' as const }
	if (ctx.finalUrl.protocol !== 'https:') {
		return check({
			...base,
			status: 'fail',
			summary: 'The page is served over plain HTTP.',
			recommendation:
				'Serve the site over HTTPS. Browsers mark HTTP pages "Not secure" and Google uses HTTPS as a ranking signal. Let\'s Encrypt certificates are free.'
		})
	}

	return check({ ...base, status: 'pass', summary: 'The page is served over HTTPS.' })
}

function httpsRedirectCheck(ctx: AuditContext): CheckResult {
	const { httpRedirect } = ctx
	const base = {
		id: 'https-redirect',
		title: 'HTTP redirects to HTTPS',
		weight: 2,
		priority: 'high' as const
	}
	if (httpRedirect.redirectsToHttps) {
		return check({
			...base,
			status: 'pass',
			summary: 'Visitors who type http:// are sent to the secure version.'
		})
	}
	if (httpRedirect.error) {
		return check({
			...base,
			status: 'pass',
			summary:
				"The site doesn't answer on plain HTTP, so there's no insecure version to reach."
		})
	}

	return check({
		...base,
		status: 'fail',
		summary: 'The http:// version of the page does not redirect to https://.',
		recommendation:
			'Add a permanent (301) redirect from HTTP to HTTPS so there is one secure version of every page.',
		details: httpRedirect.finalUrl ? [{ kind: 'code', text: httpRedirect.finalUrl }] : undefined
	})
}

function certificateCheck(ctx: AuditContext): CheckResult {
	const { tls } = ctx
	const base = {
		id: 'ssl-certificate',
		title: 'SSL certificate',
		weight: 2,
		priority: 'high' as const
	}
	if (ctx.finalUrl.protocol !== 'https:' || !tls) {
		return check({
			...base,
			status: 'fail',
			summary: 'There is no SSL certificate to check.',
			recommendation:
				"Install a certificate (free from Let's Encrypt or your host) and serve the site over HTTPS."
		})
	}
	const details: Detail[] = [
		{
			kind: 'kv',
			items: [
				['Issued by', tls.issuer || 'Unknown'],
				['Issued to', tls.subject || 'Unknown'],
				['Valid until', tls.validTo ? new Date(tls.validTo).toDateString() : 'Unknown'],
				['Days left', tls.daysLeft != null ? String(tls.daysLeft) : 'Unknown'],
				['Protocol', tls.protocol || 'Unknown']
			]
		}
	]
	if (!tls.ok) {
		return check({
			...base,
			status: 'fail',
			summary: `The certificate isn't trusted: ${tls.error}.`,
			recommendation:
				'Renew the certificate and make sure the server sends the full certificate chain.',
			details
		})
	}
	if ((tls.daysLeft ?? 0) <= 14) {
		return check({
			...base,
			status: 'warn',
			summary: `The certificate expires in ${formatCount(tls.daysLeft ?? 0, 'day')}.`,
			recommendation: 'Renew it now, and set up automatic renewal so it never lapses.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The certificate is valid for another ${formatCount(tls.daysLeft ?? 0, 'day')}.`,
		details
	})
}

function hstsCheck(ctx: AuditContext): CheckResult {
	const hsts = ctx.page.headers.get('strict-transport-security')
	const base = { id: 'hsts', title: 'HSTS', weight: 1, priority: 'medium' as const }
	if (!hsts) {
		return check({
			...base,
			status: 'warn',
			summary: 'The site does not send a Strict-Transport-Security header.',
			recommendation:
				'Send Strict-Transport-Security: max-age=31536000; includeSubDomains so browsers always use HTTPS.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'Browsers are told to always use HTTPS.',
		details: [{ kind: 'code', text: hsts }]
	})
}

function headersCheck(ctx: AuditContext): CheckResult {
	const { headers } = ctx.page
	const csp = headers.get('content-security-policy') || ''
	const present = SECURITY_HEADERS.map(([key, label]) => {
		const has =
			Boolean(headers.get(key)) || (key === 'x-frame-options' && /frame-ancestors/.test(csp))

		return { label, has }
	})
	const count = present.filter((h) => h.has).length
	const details = [
		tableDetail(
			['Header', 'Sent'],
			present.map((h) => [h.label, h.has ? 'Yes' : 'No'])
		)
	]
	const base = {
		id: 'security-headers',
		title: 'Security headers',
		weight: 1,
		priority: 'medium' as const
	}
	const summary = `The site sends ${count} of ${SECURITY_HEADERS.length} recommended security headers.`
	if (count >= 4) return check({ ...base, status: 'pass', summary, details })

	return check({
		...base,
		status: count >= 2 ? 'warn' : 'fail',
		summary,
		recommendation:
			'Add the missing headers at your server or CDN. They protect visitors from clickjacking, content sniffing and data leaks.',
		details
	})
}

function mixedContentCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'mixed-content',
		title: 'Mixed content',
		weight: 2,
		priority: 'high' as const
	}
	if (ctx.finalUrl.protocol !== 'https:') {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: 'Only applies to pages served over HTTPS.'
		})
	}
	const { $ } = ctx
	const active: string[] = []
	const passive: string[] = []
	$('script[src], iframe[src], link[rel~="stylesheet"][href], object[data], embed[src]').each(
		(_, el) => {
			const url = $(el).attr('src') || $(el).attr('href') || $(el).attr('data') || ''
			if (/^http:\/\//i.test(url)) active.push(url)
		}
	)
	$('img[src], audio[src], video[src], source[src]').each((_, el) => {
		const url = $(el).attr('src') || ''
		if (/^http:\/\//i.test(url)) passive.push(url)
	})
	if (!active.length && !passive.length) {
		return check({
			...base,
			status: 'pass',
			summary: 'Everything on the page loads over HTTPS.'
		})
	}

	return check({
		...base,
		status: active.length ? 'fail' : 'warn',
		summary: active.length
			? `${formatCount(active.length, 'script, stylesheet or frame', 'scripts, stylesheets or frames')} load over insecure HTTP and will be blocked.`
			: `${formatCount(passive.length, 'image or media file', 'images or media files')} load over insecure HTTP.`,
		recommendation:
			'Change these URLs to https://. Browsers block or warn about insecure files on secure pages.',
		details: [listDetail([...active, ...passive])]
	})
}

function emailAuthCheck(ctx: AuditContext): CheckResult {
	const { dns } = ctx
	const spf = dns?.spf
	const dmarc = dns?.dmarc
	const details: Detail[] = [
		{
			kind: 'kv',
			items: [
				['SPF', spf || 'Not found'],
				['DMARC', dmarc || 'Not found'],
				['Mail servers', dns?.mx.slice(0, 3).join(', ') || 'None']
			]
		}
	]
	const base = {
		id: 'email-auth',
		title: 'Email authentication (SPF and DMARC)',
		weight: 1,
		priority: 'low' as const
	}
	if (spf && dmarc) {
		const monitorOnly = /p=none/i.test(dmarc)

		return check({
			...base,
			status: 'pass',
			summary: monitorOnly
				? 'The domain has SPF and DMARC records (DMARC is in monitoring mode).'
				: 'The domain has SPF and DMARC records.',
			details
		})
	}

	return check({
		...base,
		status: spf || dmarc ? 'warn' : 'fail',
		summary: `The domain is missing ${[!spf && 'an SPF record', !dmarc && 'a DMARC record'].filter(Boolean).join(' and ')}.`,
		recommendation:
			'Publish SPF and DMARC DNS records so nobody can send email pretending to be your domain, and so your own email lands in inboxes.',
		details
	})
}

function serverSignatureCheck(ctx: AuditContext): CheckResult {
	const server = ctx.page.headers.get('server') || ''
	const poweredBy = ctx.page.headers.get('x-powered-by') || ''
	const leaks = [
		/\d/.test(server) && `Server: ${server}`,
		poweredBy && `X-Powered-By: ${poweredBy}`
	].filter(Boolean) as string[]
	const base = {
		id: 'server-signature',
		title: 'Server version exposure',
		weight: 0.5,
		priority: 'low' as const
	}
	if (!leaks.length) {
		return check({
			...base,
			status: 'pass',
			summary: "Headers don't reveal software versions."
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: 'Response headers reveal the software the site runs on.',
		recommendation:
			"Hide version numbers and remove X-Powered-By so attackers can't look up known weaknesses.",
		details: [listDetail(leaks)]
	})
}

function cookiesCheck(ctx: AuditContext): CheckResult {
	const cookies = ctx.page.headers.getSetCookie()
	const https = ctx.finalUrl.protocol === 'https:'
	const weak = cookies.filter(
		(c) => (https && !/;\s*secure/i.test(c)) || !/;\s*httponly/i.test(c)
	)
	const base = { id: 'cookies', title: 'Cookie security', weight: 0.5, priority: 'low' as const }
	if (!cookies.length) {
		return check({
			...base,
			status: 'pass',
			summary: "The page doesn't set cookies when it loads."
		})
	}
	if (!weak.length) {
		return check({
			...base,
			status: 'pass',
			summary: 'Cookies are marked Secure and HttpOnly.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(weak.length, 'cookie')} ${weak.length === 1 ? 'is' : 'are'} missing the Secure or HttpOnly flag.`,
		recommendation:
			'Mark cookies Secure (sent over HTTPS only) and HttpOnly (hidden from scripts) unless JavaScript needs to read them.',
		details: [listDetail(weak.map((c) => c.split(';')[0].split('=')[0]))]
	})
}

function serverInfoCheck(ctx: AuditContext): CheckResult {
	const hosting = ctx.tech.filter((t) => ['CDN', 'Hosting', 'Web server'].includes(t.category))

	return check({
		id: 'server',
		title: 'Server',
		status: 'info',
		weight: 0,
		priority: 'low',
		summary: hosting.length
			? `Served by ${hosting.map((t) => t.name).join(', ')}.`
			: 'Where the site is served from.',
		details: [
			{
				kind: 'kv',
				items: [
					['IP address', ctx.dns?.ip || 'Unknown'],
					['IPv6', ctx.dns?.ipv6 || 'Not available'],
					['Server', ctx.page.headers.get('server') || 'Not disclosed']
				]
			}
		]
	})
}

export function securityChecks(ctx: AuditContext): CheckResult[] {
	return [
		httpsCheck(ctx),
		httpsRedirectCheck(ctx),
		certificateCheck(ctx),
		mixedContentCheck(ctx),
		hstsCheck(ctx),
		headersCheck(ctx),
		emailAuthCheck(ctx),
		cookiesCheck(ctx),
		serverSignatureCheck(ctx),
		serverInfoCheck(ctx)
	]
}
