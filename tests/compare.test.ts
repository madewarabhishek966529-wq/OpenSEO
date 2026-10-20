import { describe, expect, it } from 'vitest'
import { overallScore, scoreCategories } from '@server/audit/scoring'
import {
	changeCounts,
	compareReports,
	formatChange,
	kindOf,
	metricTrend,
	pageKey,
	verdict
} from '@shared/compare'
import { gradeFor } from '@shared/grades'
import type { AuditReport, CheckResult, Status } from '@shared/types'

const check = (id: string, status: Status, over: Partial<CheckResult> = {}): CheckResult => ({
	id,
	category: 'onpage',
	title: id,
	status,
	weight: 1,
	priority: 'medium',
	summary: `${id} is ${status}`,
	...over
})

let n = 0

/** A report scored from its checks, like the engine does. */
function report(url: string, createdAt: string, checks: CheckResult[]): AuditReport {
	const categories = scoreCategories(checks)
	const score = overallScore(categories)
	const finalUrl = new URL(url)

	return {
		id: `report${++n}`,
		version: 1,
		url,
		finalUrl: url,
		domain: finalUrl.hostname.replace(/^www\./, ''),
		createdAt,
		durationMs: 1000,
		score,
		grade: gradeFor(score),
		categories,
		checks,
		overview: {
			title: 'Fernhill Coffee',
			description: '',
			statusCode: 200,
			responseTimeMs: 300,
			loadTimeMs: 900,
			pageSizeBytes: 800_000,
			htmlBytes: 40_000,
			requests: 30,
			wordCount: 500,
			technologies: [],
			topKeywords: []
		},
		source: 'web'
	}
}

describe('kindOf', () => {
	it.each([
		['pass', 'fail', 'new-problem'],
		['pass', 'warn', 'new-problem'],
		['info', 'warn', 'new-problem'],
		['warn', 'fail', 'worse'],
		['fail', 'pass', 'fixed'],
		['warn', 'info', 'fixed'],
		['fail', 'warn', 'improved'],
		['warn', 'warn', 'still-failing'],
		['pass', 'info', 'still-passing']
	] as const)('%s → %s is %s', (a, b, kind) => {
		expect(kindOf({ status: a, summary: '' }, { status: b, summary: '' })).toBe(kind)
	})

	it('notices checks that only one audit has', () => {
		expect(kindOf(undefined, { status: 'pass', summary: '' })).toBe('added')
		expect(kindOf({ status: 'pass', summary: '' }, undefined)).toBe('removed')
	})
})

describe('pageKey', () => {
	it('ignores the scheme, www and a trailing slash', () => {
		expect(pageKey('https://www.fernhill.coffee/menu/')).toBe(
			pageKey('http://fernhill.coffee/menu')
		)
		expect(pageKey('https://fernhill.coffee/menu')).not.toBe(
			pageKey('https://fernhill.coffee/')
		)
		expect(pageKey('http://localhost:8080/')).not.toBe(pageKey('http://localhost:8081/'))
	})
})

describe('compareReports', () => {
	const before = report('https://fernhill.coffee/', '2026-10-01T09:00:00.000Z', [
		check('title', 'fail', { priority: 'high', weight: 3 }),
		check('h1', 'pass', { priority: 'high', weight: 3 }),
		check('lang', 'warn', { priority: 'low' }),
		check('hsts', 'pass', { category: 'security' }),
		check('old-check', 'pass')
	])
	const after = report('https://www.fernhill.coffee/', '2026-10-08T09:00:00.000Z', [
		check('title', 'pass', { priority: 'high', weight: 3 }),
		check('h1', 'fail', { priority: 'high', weight: 3, summary: 'The page has no H1.' }),
		check('lang', 'warn', { priority: 'low' }),
		check('hsts', 'pass', { category: 'security' }),
		check('llms-txt', 'warn', { category: 'ai' })
	])

	it('puts two audits of the same page in time order', () => {
		const comparison = compareReports(after, before)
		expect(comparison.samePage).toBe(true)
		expect(comparison.a.id).toBe(before.id)
		expect(comparison.b.id).toBe(after.id)
		expect([comparison.a.label, comparison.b.label]).toEqual(['Before', 'After'])
		expect(comparison.scoreChange).toBe(after.score - before.score)
	})

	it('keeps the order given when asked to', () => {
		const comparison = compareReports(after, before, { inTimeOrder: false })
		expect([comparison.a.id, comparison.b.id]).toEqual([after.id, before.id])
	})

	it('classifies every check, the most important first', () => {
		const { checks } = compareReports(before, after)
		const kinds = Object.fromEntries(checks.map((c) => [c.id, c.kind]))
		expect(kinds).toEqual({
			title: 'fixed',
			h1: 'new-problem',
			lang: 'still-failing',
			hsts: 'still-passing',
			'old-check': 'removed',
			'llms-txt': 'added'
		})
		expect(checks.slice(0, 2).map((c) => c.id)).toEqual(['title', 'h1'])
		expect(checks.find((c) => c.id === 'h1')).toMatchObject({
			a: { status: 'pass' },
			b: { status: 'fail', summary: 'The page has no H1.' }
		})
	})

	it('compares categories and metrics', () => {
		const slower = {
			...after,
			overview: { ...after.overview, responseTimeMs: 450, wordCount: 650 }
		}
		const comparison = compareReports(before, slower)
		const onpage = comparison.categories.find((c) => c.id === 'onpage')
		expect(onpage?.change).toBe(onpage!.b.score - onpage!.a.score)
		const response = comparison.metrics.find((m) => m.id === 'responseTimeMs')!
		expect([response.a, response.b, metricTrend(response)]).toEqual([300, 450, -1])
		const words = comparison.metrics.find((m) => m.id === 'wordCount')!
		expect(metricTrend(words)).toBe(0)
	})

	it('keeps the order of two different pages and labels them by site', () => {
		const rival = report('https://beanery.example/', '2026-09-01T09:00:00.000Z', after.checks)
		const comparison = compareReports(before, rival)
		expect(comparison.samePage).toBe(false)
		expect(comparison.a.id).toBe(before.id)
		expect([comparison.a.label, comparison.b.label]).toEqual([
			'fernhill.coffee',
			'beanery.example'
		])
	})

	it('labels two pages of one site by their paths', () => {
		const menu = report(
			'https://fernhill.coffee/menu',
			'2026-10-08T09:00:00.000Z',
			after.checks
		)
		const { a, b } = compareReports(before, menu)
		expect([a.label, b.label]).toEqual(['fernhill.coffee', 'fernhill.coffee/menu'])
	})
})

describe('verdict', () => {
	const base = [check('title', 'fail'), check('h1', 'pass'), check('lang', 'warn')]
	const earlier = report('https://fernhill.coffee/', '2026-10-01T09:00:00.000Z', base)

	it('sums up a before and after', () => {
		const later = report('https://fernhill.coffee/', '2026-10-08T09:00:00.000Z', [
			check('title', 'pass'),
			check('h1', 'pass'),
			check('lang', 'fail')
		])
		const comparison = compareReports(earlier, later)
		expect(changeCounts(comparison)).toMatchObject({ fixed: 1, worse: 1 })
		expect(verdict(comparison)).toBe(
			`The score went up ${comparison.scoreChange} points, from ${earlier.score} (${earlier.grade}) to ${later.score} (${later.grade}): 1 check fixed and 1 check got worse.`
		)
	})

	it('says when nothing changed', () => {
		const again = report('https://fernhill.coffee/', '2026-10-08T09:00:00.000Z', base)
		expect(verdict(compareReports(earlier, again))).toBe(
			`The score stayed at ${earlier.score} (${earlier.grade}), and no check changed.`
		)
	})

	it('says which of two sites is ahead', () => {
		const rival = report('https://beanery.example/', '2026-10-08T09:00:00.000Z', [
			check('title', 'pass'),
			check('h1', 'fail'),
			check('lang', 'pass')
		])
		const comparison = compareReports(earlier, rival)
		expect(verdict(comparison)).toMatch(
			/^beanery\.example scores \d+ points? (higher|lower) than fernhill\.coffee \(\d+ against \d+\)\. fernhill\.coffee is behind on 2 checks, beanery\.example on 1\.$/
		)
	})
})

describe('formatChange', () => {
	it('signs the number with a real minus', () => {
		expect([formatChange(6), formatChange(-4), formatChange(0)]).toEqual(['+6', '−4', '±0'])
	})
})
