import { describe, expect, it, vi } from 'vitest'
import { runAudit } from '@server/audit'
import { onPageChecks } from '@server/audit/checks/onpage'
import type { AuditContext } from '@server/audit/context'
import { parsePage } from '@server/audit/parse'
import { overallScore, scoreCategories } from '@server/audit/scoring'
import { judgePage, noindexOnlyFromHeader, prepareReport, type GateOptions } from '@server/ci/gate'
import { annotation } from '@server/ci/github'
import { commentMarker, toMarkdown } from '@server/ci/markdown'
import { pagesFor, runCheck, type CheckResults } from '@server/ci/run'
import { gradeFor } from '@shared/grades'
import type { AuditReport, CheckResult, Status } from '@shared/types'

vi.mock('@server/audit', async (importOriginal) => ({
	...(await importOriginal<typeof import('@server/audit')>()),
	runAudit: vi.fn()
}))

const PREVIEW = 'https://fernhill-git-menu.vercel.app/'
const PRODUCTION = 'https://fernhill.coffee/'

/** The indexable check, run on a page with these headers and this <head>. */
function indexable(head: string, headers: Record<string, string> = {}): CheckResult {
	const html = `<!doctype html><html lang="en"><head>${head}<title>Fernhill</title></head><body><h1>Coffee</h1></body></html>`
	const page = {
		url: PREVIEW,
		status: 200,
		ok: true,
		headers: new Headers({ 'content-type': 'text/html', ...headers }),
		redirects: [],
		body: Buffer.from(html),
		bytes: html.length,
		truncated: false,
		ttfbMs: 100,
		totalMs: 200,
		contentType: 'text/html'
	}
	const ctx = {
		...parsePage(page),
		page,
		robots: { url: `${PREVIEW}robots.txt`, found: false },
		sitemap: { found: false, tried: [] },
		inputUrl: PREVIEW
	} as unknown as AuditContext

	return onPageChecks(ctx).find((c) => c.id === 'indexable') as CheckResult
}

function check(id: string, status: Status, over: Partial<CheckResult> = {}): CheckResult {
	return {
		id,
		category: 'onpage',
		title: id,
		status,
		weight: 2,
		priority: 'high',
		summary: `${id} ${status}`,
		...over
	}
}

let n = 0

function report(url: string, checks: CheckResult[]): AuditReport {
	const categories = scoreCategories(checks)
	const score = overallScore(categories)

	return {
		id: `ci${++n}report`,
		version: 1,
		url,
		finalUrl: url,
		domain: new URL(url).hostname,
		createdAt: new Date(2026, 9, 11, 9, 0, n).toISOString(),
		durationMs: 10,
		score,
		grade: gradeFor(score),
		categories,
		checks,
		overview: {
			title: 'Fernhill',
			description: '',
			statusCode: 200,
			responseTimeMs: 100,
			loadTimeMs: 200,
			pageSizeBytes: 1000,
			htmlBytes: 1000,
			requests: 1,
			wordCount: 300,
			technologies: [],
			topKeywords: []
		},
		source: 'cli'
	}
}

const gate: GateOptions = { maxDrop: 2, minScore: 0, failOn: 'fail', ignore: [], preview: true }

describe('noindexOnlyFromHeader', () => {
	it('recognizes the header preview hosts add', () => {
		const result = indexable('', { 'x-robots-tag': 'noindex' })
		expect(result.status).toBe('fail')
		expect(noindexOnlyFromHeader(result)).toBe(true)
	})

	it('still counts a noindex in the page', () => {
		const meta = '<meta name="robots" content="noindex">'
		expect(noindexOnlyFromHeader(indexable(meta, { 'x-robots-tag': 'noindex' }))).toBe(false)
		expect(noindexOnlyFromHeader(indexable(meta))).toBe(false)
		expect(noindexOnlyFromHeader(indexable('<meta name="robots" content="index">'))).toBe(false)
	})
})

describe('prepareReport', () => {
	const base = report(PREVIEW, [
		check('title', 'pass'),
		check('indexable', 'fail', {
			details: [{ kind: 'list', items: ['X-Robots-Tag: noindex'] }]
		}),
		check('canonical', 'warn'),
		check('lang', 'warn')
	])

	it('forgives preview differences on the preview only', () => {
		const preview = prepareReport(base, gate, 'candidate')
		expect(preview.checks.map((c) => [c.id, c.status])).toEqual([
			['title', 'pass'],
			['indexable', 'pass'],
			['lang', 'warn']
		])
		expect(preview.score).toBeGreaterThan(base.score)
		const production = prepareReport(base, gate, 'baseline')
		expect(production.checks.find((c) => c.id === 'indexable')?.status).toBe('fail')
	})

	it('leaves out ignored checks and keeps everything without preview mode', () => {
		const plain = prepareReport(base, { ignore: ['lang'], preview: false }, 'candidate')
		expect(plain.checks.map((c) => c.id)).toEqual(['title', 'indexable', 'canonical'])
	})
})

describe('judgePage', () => {
	const production = report(PRODUCTION, [
		check('title', 'pass'),
		check('h1', 'pass'),
		check('lang', 'warn'),
		check('response-time', 'pass', { category: 'performance' })
	])

	it('passes a page that held up', () => {
		const verdict = judgePage(
			{ label: '/', url: PREVIEW, report: production, baselineReport: production },
			gate
		)
		expect(verdict.failures).toEqual([])
	})

	it('fails on a score drop and on checks that start failing', () => {
		const preview = report(PREVIEW, [
			check('title', 'fail'),
			check('h1', 'warn'),
			check('lang', 'pass'),
			check('response-time', 'fail', { category: 'performance' })
		])
		const verdict = judgePage(
			{ label: '/', url: PREVIEW, report: preview, baselineReport: production },
			gate
		)
		const drop = verdict.baselineReport!.score - verdict.report!.score
		expect(verdict.failures).toEqual([
			`/ dropped ${drop} points (${verdict.baselineReport!.score} → ${verdict.report!.score}), more than the 2 allowed.`,
			'/: 1 check started failing: title.'
		])
		expect(verdict.newProblems.map((c) => c.id)).toEqual(['title'])
		expect(verdict.fixed.map((c) => c.id)).toEqual(['lang'])

		const strict = judgePage(
			{ label: '/', url: PREVIEW, report: preview, baselineReport: production },
			{ ...gate, failOn: 'warn', maxDrop: 100 }
		)
		expect(strict.failures).toEqual(['/: 2 checks got worse: title and h1.'])
		const lenient = judgePage(
			{ label: '/', url: PREVIEW, report: preview, baselineReport: production },
			{ ...gate, failOn: 'none', maxDrop: 100 }
		)
		expect(lenient.failures).toEqual([])
	})

	it('leaves timings out, so a slow preview alone passes', () => {
		const slow = report(PREVIEW, [
			check('title', 'pass'),
			check('h1', 'pass'),
			check('lang', 'warn'),
			check('response-time', 'fail', { category: 'performance' }),
			check('load-time', 'warn', { category: 'performance' })
		])
		const verdict = judgePage(
			{ label: '/', url: PREVIEW, report: slow, baselineReport: production },
			gate
		)
		expect(verdict.failures).toEqual([])
		expect(verdict.report!.score).toBe(verdict.baselineReport!.score)
		expect(verdict.report!.checks.map((c) => c.id)).not.toContain('response-time')
	})

	it('fails a page that did not load or scores below the minimum', () => {
		expect(judgePage({ label: '/', url: PREVIEW, error: 'HTTP 500' }, gate).failures).toEqual([
			"/ didn't load: HTTP 500"
		])
		const low = judgePage(
			{ label: '/', url: PREVIEW, report: production },
			{
				...gate,
				minScore: 99
			}
		)
		expect(low.failures[0]).toMatch(/^\/ scores \d+, below the minimum of 99\.$/)
	})
})

describe('pagesFor', () => {
	it('audits each path on both sites', () => {
		expect(pagesFor(PREVIEW, PRODUCTION, ['/', '/menu?size=large'])).toEqual([
			{ label: '/', url: PREVIEW, baselineUrl: PRODUCTION },
			{
				label: '/menu?size=large',
				url: `${PREVIEW}menu?size=large`,
				baselineUrl: `${PRODUCTION}menu?size=large`
			}
		])
		expect(pagesFor(PREVIEW, undefined, [])).toEqual([
			{ label: 'fernhill-git-menu.vercel.app', url: PREVIEW, baselineUrl: undefined }
		])
	})
})

describe('runCheck', () => {
	it('keeps the headers and PageSpeed key out of the results', async () => {
		vi.mocked(runAudit).mockImplementation(async (url) => report(url, [check('title', 'pass')]))
		const results = await runCheck({
			url: PREVIEW,
			baseline: PRODUCTION,
			paths: [],
			maxDrop: 2,
			minScore: 0,
			failOn: 'fail',
			ignore: [],
			preview: 'auto',
			headers: { 'x-vercel-protection-bypass': 'bypass-secret-123' },
			pagespeedKey: 'pagespeed-secret-456'
		})
		expect(results.passed).toBe(true)
		expect(results.options).toEqual({
			url: PREVIEW,
			baseline: PRODUCTION,
			maxDrop: 2,
			minScore: 0,
			failOn: 'fail',
			ignore: [],
			preview: true
		})
		const saved = JSON.stringify(results)
		expect(saved).not.toContain('bypass-secret-123')
		expect(saved).not.toContain('pagespeed-secret-456')
	})
})

describe('toMarkdown', () => {
	const production = report(PRODUCTION, [check('title', 'pass'), check('h1', 'pass')])
	const preview = report(PREVIEW, [
		check('title', 'fail', { summary: 'The page has no <title>.' }),
		check('h1', 'pass')
	])
	const verdict = judgePage(
		{ label: '/', url: PREVIEW, report: preview, baselineReport: production },
		gate
	)
	const results: CheckResults = {
		passed: false,
		pages: [verdict],
		failures: verdict.failures,
		warnings: [],
		options: { ...gate, url: PREVIEW, baseline: PRODUCTION }
	}

	it('sums up the check for a pull request', () => {
		const markdown = toMarkdown(results, '0.3.0')
		expect(markdown).toContain('### ✖ OpenSEO check failed')
		expect(markdown).toContain('Compared the preview with production on 1 page.')
		expect(markdown).toContain(
			`| ✖ | \`/\` | ${production.score} ${production.grade} | ${verdict.report!.score} ${verdict.report!.grade} |`
		)
		expect(markdown).toContain('- ✖ **title** (On-page SEO): The page has no &lt;title&gt;.')
		expect(markdown).toContain('<details><summary>Every change on / (1)</summary>')
		expect(markdown).toContain(
			'Checked with [OpenSEO](https://github.com/alexsilver8/open-seo) 0.3.0.'
		)
	})

	it('keeps backslashes and pipes from breaking the tables', () => {
		const odd = report(PREVIEW, [
			check('title', 'fail', { summary: 'Starts with C:\\temp|draft' }),
			check('h1', 'pass')
		])
		const page = judgePage(
			{ label: '/a|b', url: PREVIEW, report: odd, baselineReport: production },
			gate
		)
		const markdown = toMarkdown({ ...results, pages: [page], failures: page.failures }, '0.3.0')
		expect(markdown).toContain('Starts with C:\\\\temp\\|draft')
		expect(markdown).toContain('| ✖ | /a\\|b |')
	})

	it('marks the comment by the site it checks', () => {
		expect(commentMarker('fernhill.coffee')).toBe('<!-- openseo-check fernhill.coffee -->')
	})
})

describe('annotation', () => {
	it('escapes messages the way GitHub reads them', () => {
		expect(annotation('error', '100% broken\nsecond line')).toBe(
			'::error title=OpenSEO::100%25 broken%0Asecond line'
		)
	})
})
