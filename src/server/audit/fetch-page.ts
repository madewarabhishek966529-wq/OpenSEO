import { AuditError, safeFetch, type SafeFetchResult } from './http'

const PAGE_OPTIONS = { timeoutMs: 20_000, maxBytes: 8 * 1024 * 1024 }

function assertWebPage(page: SafeFetchResult): SafeFetchResult {
	if (page.status === 401 || page.status === 403 || page.status === 429) {
		throw new AuditError(
			`The site refused our request (HTTP ${page.status}). Some sites block automated tools; try another page, or allow the OpenSEO user agent.`,
			'blocked'
		)
	}
	if (page.status >= 400) {
		throw new AuditError(
			`The page answered with HTTP ${page.status}. Check the address and try again.`,
			'http_error'
		)
	}
	if (page.contentType && !/html|xml|text\/plain/.test(page.contentType)) {
		throw new AuditError(
			`That address isn't a web page (it's ${page.contentType}).`,
			'not_html'
		)
	}

	return page
}

/**
 * Fetches the page to audit. When someone typed a bare domain and HTTPS fails for a reason other
 * than DNS, it tries plain HTTP before giving up.
 */
export async function fetchPage(url: string, explicitScheme: boolean): Promise<SafeFetchResult> {
	try {
		return assertWebPage(await safeFetch(url, PAGE_OPTIONS))
	} catch (e) {
		const err = e as AuditError
		const canRetry =
			!explicitScheme &&
			url.startsWith('https://') &&
			!['dns', 'private_host', 'http_error', 'not_html', 'blocked'].includes(err.code)
		if (!canRetry) throw e

		return assertWebPage(await safeFetch(url.replace(/^https:/, 'http:'), PAGE_OPTIONS))
	}
}
