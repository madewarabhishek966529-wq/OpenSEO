import { describe, expect, it } from 'vitest'
import { assertPublicHost, isPrivateIp, normalizeInputUrl } from '@server/audit/http'

describe('isPrivateIp', () => {
	it.each([
		'127.0.0.1',
		'10.1.2.3',
		'172.20.0.1',
		'192.168.1.1',
		'169.254.169.254',
		'100.64.0.1',
		'::1',
		'fd00::1',
		'fe80::1',
		'::ffff:10.0.0.1'
	])('blocks %s', (ip) => {
		expect(isPrivateIp(ip)).toBe(true)
	})

	it.each(['8.8.8.8', '151.101.1.69', '2606:4700::6810:84e5'])('allows %s', (ip) => {
		expect(isPrivateIp(ip)).toBe(false)
	})
})

describe('normalizeInputUrl', () => {
	it('adds https and drops the fragment', () => {
		expect(normalizeInputUrl(' example.com/pricing#plans ')).toBe('https://example.com/pricing')
	})

	it('keeps http when it was typed', () => {
		expect(normalizeInputUrl('http://example.com')).toBe('http://example.com/')
	})

	it.each(['', 'not a url', 'intranet'])('rejects %j', (input) => {
		expect(() => normalizeInputUrl(input)).toThrow()
	})
})

describe('assertPublicHost', () => {
	it('refuses internal hosts', async () => {
		await expect(assertPublicHost('localhost')).rejects.toThrow(/internal/)
		await expect(assertPublicHost('192.168.0.10')).rejects.toThrow(/private/)
	})
})
