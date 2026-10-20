import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, mergeSettings, parseEmails, readableTextOn } from '@shared/settings'

describe('mergeSettings', () => {
	it('keeps valid changes', () => {
		const merged = mergeSettings(DEFAULT_SETTINGS, {
			brandName: '  Silver Design ',
			brandColor: '#3B5BFD',
			ctaUrl: 'https://cal.com/alex',
			pagespeedEnabled: true,
			crawlPageLimit: 250,
			theme: 'dark'
		})
		expect(merged).toMatchObject({
			theme: 'dark',
			brandName: 'Silver Design',
			brandColor: '#3b5bfd',
			ctaUrl: 'https://cal.com/alex',
			pagespeedEnabled: true,
			crawlPageLimit: 250
		})
	})

	it('drops anything invalid', () => {
		const merged = mergeSettings(DEFAULT_SETTINGS, {
			brandColor: 'red',
			ctaUrl: 'javascript:alert(1)',
			brandLogo: 'data:text/html;base64,PHNjcmlwdD4=',
			pagespeedEnabled: 'yes',
			brokenLinkLimit: -5,
			theme: 'sepia',
			unknown: true
		})
		expect(merged).toEqual(DEFAULT_SETTINGS)
	})

	it('caps numbers and falls back to the default name', () => {
		const merged = mergeSettings(DEFAULT_SETTINGS, { crawlPageLimit: 10_000, brandName: '   ' })
		expect(merged.crawlPageLimit).toBe(500)
		expect(merged.brandName).toBe('OpenSEO')
	})
})

describe('readableTextOn', () => {
	it('picks ink on light colors and white on dark ones', () => {
		expect(readableTextOn('#c8f135')).toBe('#0b1220')
		expect(readableTextOn('#0b1220')).toBe('#ffffff')
	})
})

describe('alert settings', () => {
	it('keeps valid alert channels', () => {
		const merged = mergeSettings(DEFAULT_SETTINGS, {
			alertEmails: [' Alex@Fernhill.coffee', 'team@fernhill.coffee', 'alex@fernhill.coffee'],
			slackWebhookUrl: 'https://hooks.slack.com/services/T000/B000/abc',
			discordWebhookUrl: 'https://discord.com/api/webhooks/1234/abc-DEF_1',
			webhookUrl: 'https://hooks.zapier.com/hooks/catch/1/abc/',
			appUrl: 'https://seo.fernhill.coffee/'
		})
		expect(merged).toMatchObject({
			alertEmails: ['alex@fernhill.coffee', 'team@fernhill.coffee'],
			slackWebhookUrl: 'https://hooks.slack.com/services/T000/B000/abc',
			discordWebhookUrl: 'https://discord.com/api/webhooks/1234/abc-DEF_1',
			webhookUrl: 'https://hooks.zapier.com/hooks/catch/1/abc/',
			appUrl: 'https://seo.fernhill.coffee'
		})
	})

	it('drops addresses that are not what they claim to be', () => {
		const merged = mergeSettings(DEFAULT_SETTINGS, {
			alertEmails: ['alex@fernhill.coffee', 'not an email'],
			slackWebhookUrl: 'https://hooks.slack.com.evil.example/services/x',
			discordWebhookUrl: 'https://discord.com/channels/1/2',
			webhookUrl: 'ftp://files.example.com/hook',
			appUrl: 'javascript:alert(1)'
		})
		expect(merged).toEqual(DEFAULT_SETTINGS)
	})

	it('clears a channel with an empty value', () => {
		const set = mergeSettings(DEFAULT_SETTINGS, {
			slackWebhookUrl: 'https://hooks.slack.com/services/T/B/x'
		})
		expect(mergeSettings(set, { slackWebhookUrl: '' }).slackWebhookUrl).toBe('')
	})
})

describe('parseEmails', () => {
	it('splits on commas, semicolons and spaces and reports the rest', () => {
		expect(parseEmails('alex@fernhill.coffee, Team@Fernhill.coffee;ops@x.io  oops')).toEqual({
			emails: ['alex@fernhill.coffee', 'team@fernhill.coffee', 'ops@x.io'],
			invalid: ['oops']
		})
	})
})
