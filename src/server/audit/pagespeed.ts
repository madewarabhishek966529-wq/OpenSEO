import type { Metric, PageSpeedResult, PageSpeedStrategyResult, Status } from '@shared/types'

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

const LAB_METRICS: [string, string][] = [
	['first-contentful-paint', 'First Contentful Paint'],
	['largest-contentful-paint', 'Largest Contentful Paint'],
	['total-blocking-time', 'Total Blocking Time'],
	['cumulative-layout-shift', 'Cumulative Layout Shift'],
	['speed-index', 'Speed Index']
]

const FIELD_METRICS: [string, string, (p: number) => string][] = [
	[
		'LARGEST_CONTENTFUL_PAINT_MS',
		'Largest Contentful Paint',
		(p) => `${(p / 1000).toFixed(1)} s`
	],
	['INTERACTION_TO_NEXT_PAINT', 'Interaction to Next Paint', (p) => `${p} ms`],
	['CUMULATIVE_LAYOUT_SHIFT_SCORE', 'Cumulative Layout Shift', (p) => (p / 100).toFixed(2)],
	['FIRST_CONTENTFUL_PAINT_MS', 'First Contentful Paint', (p) => `${(p / 1000).toFixed(1)} s`],
	['EXPERIMENTAL_TIME_TO_FIRST_BYTE', 'Time to First Byte', (p) => `${(p / 1000).toFixed(1)} s`]
]

interface LighthouseAudit {
	score: number | null
	displayValue?: string
	numericValue?: number
	details?: { data?: string; items?: unknown[] }
}

interface PsiResponse {
	lighthouseResult?: {
		categories?: Record<string, { score: number | null }>
		audits?: Record<string, LighthouseAudit>
	}
	loadingExperience?: {
		metrics?: Record<string, { percentile: number; category: string }>
	}
	error?: { message?: string }
}

function scoreTone(score: number | null | undefined): Status | undefined {
	if (score == null) return undefined
	if (score >= 0.9) return 'pass'

	return score >= 0.5 ? 'warn' : 'fail'
}

function fieldTone(category: string): Status {
	if (category === 'FAST') return 'pass'

	return category === 'AVERAGE' ? 'warn' : 'fail'
}

function percent(score: number | null | undefined): number | undefined {
	return score == null ? undefined : Math.round(score * 100)
}

async function runStrategy(
	url: string,
	strategy: 'mobile' | 'desktop',
	apiKey?: string
): Promise<PageSpeedStrategyResult> {
	const params = new URLSearchParams({ url, strategy })
	for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
		params.append('category', category)
	}
	if (apiKey) params.set('key', apiKey)
	const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(90_000) })
	const data = (await res.json()) as PsiResponse
	if (!res.ok || !data.lighthouseResult) {
		const reason =
			res.status === 429
				? 'Google rate-limited the request. Add a PageSpeed API key in Settings.'
				: data.error?.message || `PageSpeed Insights answered ${res.status}.`
		throw new Error(reason)
	}
	const { categories = {}, audits = {} } = data.lighthouseResult
	const metrics: Metric[] = LAB_METRICS.filter(([id]) => audits[id]).map(([id, label]) => ({
		label,
		value: audits[id].displayValue ?? '–',
		tone: scoreTone(audits[id].score)
	}))
	const fieldData = data.loadingExperience?.metrics
	const field: Metric[] | undefined = fieldData
		? FIELD_METRICS.filter(([id]) => fieldData[id]).map(([id, label, format]) => ({
				label,
				value: format(fieldData[id].percentile),
				tone: fieldTone(fieldData[id].category)
			}))
		: undefined

	return {
		strategy,
		performance: percent(categories.performance?.score),
		accessibility: percent(categories.accessibility?.score),
		bestPractices: percent(categories['best-practices']?.score),
		seo: percent(categories.seo?.score),
		metrics,
		field: field?.length ? field : undefined,
		screenshot: audits['final-screenshot']?.details?.data,
		consoleErrors: audits['errors-in-console']?.details?.items?.length
	}
}

/**
 * Runs Google PageSpeed Insights (Lighthouse in a real Chrome) for phones and desktops. It takes
 * 15–40 seconds, so the audit starts it first and collects it last.
 */
export async function runPageSpeed(url: string, apiKey?: string): Promise<PageSpeedResult> {
	const [mobile, desktop] = await Promise.allSettled([
		runStrategy(url, 'mobile', apiKey),
		runStrategy(url, 'desktop', apiKey)
	])
	const result: PageSpeedResult = {}
	if (mobile.status === 'fulfilled') result.mobile = mobile.value
	if (desktop.status === 'fulfilled') result.desktop = desktop.value
	const failed = [mobile, desktop].find((r) => r.status === 'rejected')
	if (failed && !result.mobile && !result.desktop) {
		result.error =
			(failed as PromiseRejectedResult).reason?.message ?? 'PageSpeed Insights failed.'
	}

	return result
}
