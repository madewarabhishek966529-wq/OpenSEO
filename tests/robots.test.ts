import { describe, expect, it } from 'vitest'
import { groupsFor, isAllowed, mentionsAgent, parseRobots } from '@server/audit/robots'

const robots = parseRobots(
	[
		'# comment',
		'User-agent: *',
		'Disallow: /admin',
		'Allow: /admin/public',
		'Disallow: /*.pdf$',
		'',
		'User-agent: GPTBot',
		'User-agent: CCBot',
		'Disallow: /',
		'',
		'Sitemap: https://example.com/sitemap.xml'
	].join('\n')
)

describe('parseRobots', () => {
	it('groups consecutive user agents and collects sitemaps', () => {
		expect(robots.groups).toHaveLength(2)
		expect(robots.groups[1].agents).toEqual(['gptbot', 'ccbot'])
		expect(robots.sitemaps).toEqual(['https://example.com/sitemap.xml'])
	})

	it('ignores an empty Disallow', () => {
		expect(parseRobots('User-agent: *\nDisallow:').groups[0].rules).toEqual([])
	})
})

describe('isAllowed', () => {
	it.each([
		['Googlebot', '/', true],
		['Googlebot', '/admin/settings', false],
		['Googlebot', '/admin/public/page', true],
		['Googlebot', '/files/report.pdf', false],
		['Googlebot', '/files/report.pdf?download=1', true],
		['GPTBot', '/', false],
		['ClaudeBot', '/blog', true]
	])('%s on %s → %s', (agent, path, allowed) => {
		expect(isAllowed(robots, agent, path)).toBe(allowed)
	})

	it('lets Allow win a tie with Disallow', () => {
		const tie = parseRobots('User-agent: *\nDisallow: /page\nAllow: /page')
		expect(isAllowed(tie, 'Googlebot', '/page')).toBe(true)
	})
})

describe('groupsFor and mentionsAgent', () => {
	it('falls back to the * group', () => {
		expect(groupsFor(robots, 'PerplexityBot')[0].agents).toEqual(['*'])
		expect(mentionsAgent(robots, 'PerplexityBot')).toBe(false)
		expect(mentionsAgent(robots, 'GPTBot')).toBe(true)
	})
})
