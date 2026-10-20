import { describe, expect, it } from 'vitest'
import { CATEGORIES, gradeFor, toneFor } from '@shared/grades'

describe('gradeFor', () => {
	it.each([
		[100, 'A+'],
		[95, 'A+'],
		[94, 'A'],
		[85, 'A-'],
		[72, 'B-'],
		[60, 'C'],
		[40, 'D-'],
		[39, 'F'],
		[0, 'F']
	])('%i → %s', (score, grade) => {
		expect(gradeFor(score)).toBe(grade)
	})
})

describe('toneFor', () => {
	it('is green from 80, amber from 55 and red below', () => {
		expect([80, 79, 55, 54].map(toneFor)).toEqual(['pass', 'warn', 'warn', 'fail'])
	})
})

describe('CATEGORIES', () => {
	it('weighs up to 100', () => {
		expect(CATEGORIES.reduce((n, c) => n + c.weight, 0)).toBe(100)
	})
})
