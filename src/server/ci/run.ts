import { AuditError, runAudit } from '@server/audit'
import { normalizeInputUrl, setHostHeaders } from '@server/audit/http'
import { displayUrl } from '@shared/format'
import type { AuditReport } from '@shared/types'
import { judgePage, type GateOptions, type PageAudit, type PageVerdict } from './gate'

export interface CheckOptions extends Omit<GateOptions, 'preview'> {
	url: string
	baseline?: string
	/** Paths to audit on both sites, like "/" and "/pricing". Empty audits the URLs as given. */
	paths: string[]
	/** Forgive what preview hosts change. "auto" does when the two URLs are on different hosts. */
	preview: 'auto' | 'on' | 'off'
	/** Headers for requests to the audited URL's host, like a protection bypass token. */
	headers?: Record<string, string>
	pagespeedKey?: string
	log?(line: string): void
}

export interface CheckResults {
	passed: boolean
	pages: PageVerdict[]
	/** Why the check failed, page by page. */
	failures: string[]
	/** Things worth knowing that don't fail the check, like a baseline that didn't load. */
	warnings: string[]
	options: GateOptions & { baseline?: string; url: string }
}

/** The pairs of pages to audit: each path on both sites, or just the two URLs. */
export function pagesFor(
	url: string,
	baseline: string | undefined,
	paths: string[]
): Omit<PageAudit, 'report' | 'baselineReport'>[] {
	if (!paths.length) return [{ label: displayUrl(url), url, baselineUrl: baseline }]

	return paths.map((path) => ({
		label: path,
		url: new URL(path, url).toString(),
		baselineUrl: baseline && new URL(path, baseline).toString()
	}))
}

async function audit(url: string, pagespeedKey?: string) {
	try {
		const report: AuditReport = await runAudit(url, {
			source: 'cli',
			pagespeed: { enabled: Boolean(pagespeedKey), apiKey: pagespeedKey }
		})

		return { report }
	} catch (e) {
		return { error: e instanceof AuditError ? e.message : String(e) }
	}
}

/**
 * Audits each page on the audited site and the baseline at the same time, so both see the same
 * network, then judges every page. Throws only for an address that can't be audited at all.
 */
export async function runCheck(options: CheckOptions): Promise<CheckResults> {
	const url = normalizeInputUrl(options.url)
	const baseline = options.baseline ? normalizeInputUrl(options.baseline) : undefined
	const preview =
		options.preview === 'auto'
			? Boolean(baseline) && new URL(url).host !== new URL(baseline ?? url).host
			: options.preview === 'on'
	const gate: GateOptions = { ...options, preview }
	if (options.headers) setHostHeaders(new URL(url).hostname, options.headers)

	const pages: PageVerdict[] = []
	for (const page of pagesFor(url, baseline, options.paths)) {
		options.log?.(`Auditing ${page.url}${page.baselineUrl ? ` and ${page.baselineUrl}` : ''}`)
		const [candidate, base] = await Promise.all([
			audit(page.url, options.pagespeedKey),
			page.baselineUrl ? audit(page.baselineUrl, options.pagespeedKey) : undefined
		])
		pages.push(
			judgePage(
				{
					...page,
					report: candidate.report,
					error: candidate.error,
					baselineReport: base?.report,
					baselineError: base?.error
				},
				gate
			)
		)
	}
	const failures = pages.flatMap((p) => p.failures)
	const warnings = pages
		.filter((p) => p.baselineError)
		.map(
			(p) =>
				`The baseline for ${p.label} didn't load (${p.baselineError}), so it was only checked against the minimum score.`
		)

	return {
		passed: failures.length === 0,
		pages,
		failures,
		warnings,
		// Only what the check decided with: the headers and PageSpeed key are secrets.
		options: {
			url,
			baseline,
			maxDrop: gate.maxDrop,
			minScore: gate.minScore,
			failOn: gate.failOn,
			ignore: gate.ignore,
			preview: gate.preview
		}
	}
}
