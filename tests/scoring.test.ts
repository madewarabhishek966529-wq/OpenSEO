import { describe, expect, it } from 'vitest'
import { overallScore, recommendations, scoreCategories } from '@server/audit/scoring'
import type { CheckResult } from '@shared/types'

const check = (over: Partial<CheckResult>): CheckResult => ({
	id: over.id ?? Math.random().toString(36),
	category: 'onpage',
	title: 'Check',
	status: 'pass',
	weight: 1,
	priority: 'medium',
	summary: '',
	...over
})

describe('scoreCategories', () => {
	it('weights checks, counts warnings as half and ignores info', () => {
		const [onpage] = scoreCategories([
			check({ status: 'pass', weight: 2 }),
			check({ status: 'warn', weight: 1 }),
			check({ status: 'fail', weight: 1 }),
			check({ status: 'info', weight: 5 })
		])
		expect(onpage.score).toBe(63)
		expect(onpage.grade).toBe('C')
		expect(onpage.counts).toEqual({ pass: 1, warn: 1, fail: 1, info: 1 })
	})

	it('gives a category with nothing to score full marks', () => {
		const categories = scoreCategories([])
		expect(categories.every((c) => c.score === 100)).toBe(true)
	})
})

describe('overallScore', () => {
	it('weighs categories by importance', () => {
		const categories = scoreCategories([check({ status: 'fail', category: 'onpage' })])
		// On-page is 30% of the score; every other category is perfect.
		expect(overallScore(categories)).toBe(70)
	})
})

describe('recommendations', () => {
	it('lists problems by priority, then failures before warnings', () => {
		const list = recommendations([
			check({ id: 'low-fail', priority: 'low', status: 'fail' }),
			check({ id: 'high-warn', priority: 'high', status: 'warn' }),
			check({ id: 'high-fail', priority: 'high', status: 'fail' }),
			check({ id: 'passing', priority: 'high', status: 'pass' })
		])
		expect(list.map((c) => c.id)).toEqual(['high-fail', 'high-warn', 'low-fail'])
	})
})
