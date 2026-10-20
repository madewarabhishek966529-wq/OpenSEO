import { randomBytes } from 'node:crypto'
import { gradeFor } from '@shared/grades'
import type { AuditProgress, AuditReport, PageSpeedResult, ReportSource } from '@shared/types'
import { aiChecks } from './checks/ai'
import { linkChecks } from './checks/links'
import { onPageChecks } from './checks/onpage'
import { estimatedLoadMs, pageWeight, performanceChecks } from './checks/performance'
import { securityChecks } from './checks/security'
import { socialChecks } from './checks/social'
import { usabilityChecks } from './checks/usability'
import type { AuditContext } from './context'
import { fetchPage } from './fetch-page'
import { gather } from './gather'
import { normalizeInputUrl, stripWww } from './http'
import { topKeywords } from './keywords'
import { runPageSpeed } from './pagespeed'
import { parsePage } from './parse'
import { bestFavicon } from './previews'
import { overallScore, scoreCategories } from './scoring'

export { AuditError } from './http'

export interface AuditOptions {
	onProgress?(progress: AuditProgress): void
	pagespeed?: { enabled: boolean; apiKey?: string }
	brokenLinkLimit?: number
	source?: ReportSource
}

export function newId(): string {
	return randomBytes(9).toString('base64url')
}

/** Audits one page and returns the graded report. Throws AuditError with a readable message. */
export async function runAudit(input: string, options: AuditOptions = {}): Promise<AuditReport> {
	const { onProgress, pagespeed, brokenLinkLimit = 40, source = 'web' } = options
	const started = Date.now()
	let pct = 0
	const progress = (step: string, label: string, to: number) => {
		pct = Math.max(pct, to)
		onProgress?.({ step, label, pct })
	}

	const explicitScheme = /^https?:\/\//i.test(input.trim())
	const url = normalizeInputUrl(input)
	progress('fetch', `Fetching ${url.replace(/^https?:\/\//, '')}`, 4)

	const pagespeedEnabled = Boolean(pagespeed?.enabled)
	const pagespeedRun: Promise<PageSpeedResult> | undefined = pagespeedEnabled
		? runPageSpeed(url, pagespeed?.apiKey).catch((e: Error) => ({ error: e.message }))
		: undefined

	const page = await fetchPage(url, explicitScheme)
	progress('parse', 'Reading the page', 15)
	const parsed = parsePage(page)

	let finished = 0
	const gathered = await gather(parsed, {
		brokenLinkLimit,
		onStep: (label) => {
			finished++
			progress('gather', label, 15 + finished * 15)
		}
	})

	if (pagespeedRun) progress('pagespeed', 'Waiting for PageSpeed Insights', 80)
	const ctx: AuditContext = {
		...parsed,
		...gathered,
		inputUrl: url,
		page,
		pagespeedEnabled,
		pagespeed: pagespeedRun ? await pagespeedRun : undefined
	}

	progress('score', 'Scoring the results', 95)
	const checks = [
		...onPageChecks(ctx),
		...linkChecks(ctx),
		...usabilityChecks(ctx),
		...performanceChecks(ctx),
		...socialChecks(ctx),
		...securityChecks(ctx),
		...aiChecks(ctx)
	]
	const categories = scoreCategories(checks)
	const score = overallScore(categories)

	return {
		id: newId(),
		version: 1,
		url,
		finalUrl: page.url,
		domain: stripWww(ctx.finalUrl.hostname),
		createdAt: new Date().toISOString(),
		durationMs: Date.now() - started,
		score,
		grade: gradeFor(score),
		categories,
		checks,
		overview: {
			title: ctx.title,
			description: ctx.description,
			favicon: bestFavicon(ctx.sharing.icons)?.url,
			statusCode: page.status,
			responseTimeMs: page.ttfbMs,
			loadTimeMs: estimatedLoadMs(ctx),
			pageSizeBytes: pageWeight(ctx),
			htmlBytes: page.bytes,
			requests: 1 + ctx.resourcesDiscovered,
			wordCount: ctx.wordCount,
			serverIp: ctx.dns?.ip,
			technologies: ctx.tech,
			topKeywords: topKeywords(ctx.text, 10).single
		},
		sharing: ctx.sharing,
		pagespeed: ctx.pagespeed && {
			...ctx.pagespeed,
			// Screenshots live in the usability check; keep the report file small.
			mobile: ctx.pagespeed.mobile && { ...ctx.pagespeed.mobile, screenshot: undefined },
			desktop: ctx.pagespeed.desktop && { ...ctx.pagespeed.desktop, screenshot: undefined }
		},
		source
	}
}
