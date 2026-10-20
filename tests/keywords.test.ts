import { describe, expect, it } from 'vitest'
import { containsTerm, tokenize, topKeywords } from '@server/audit/keywords'

describe('tokenize', () => {
	it('lowercases words in any language and drops possessives', () => {
		expect(tokenize("Zürich's Café — São Paulo 2026")).toEqual([
			'zürich',
			'café',
			'são',
			'paulo',
			'2026'
		])
	})
})

describe('topKeywords', () => {
	const text =
		'Handmade leather bags. Our leather bags are made in Dublin. Leather bags last for years, and the leather ages well.'

	it('counts words and two-word phrases without stopwords', () => {
		const { single, phrases } = topKeywords(text)
		expect(single[0]).toEqual({ term: 'leather', count: 4 })
		expect(phrases[0]).toEqual({ term: 'leather bags', count: 3 })
		expect(single.some((k) => k.term === 'the' || k.term === 'our')).toBe(false)
	})

	it('needs a word to appear twice', () => {
		expect(topKeywords('one lonely word').single).toEqual([])
	})
})

describe('containsTerm', () => {
	it('matches whole words only', () => {
		expect(containsTerm('Leather bags from Dublin', 'leather bags')).toBe(true)
		expect(containsTerm('Leatherbags', 'leather')).toBe(false)
		expect(containsTerm('', 'leather')).toBe(false)
	})
})
