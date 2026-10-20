import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendAlert, testMessage } from '@server/notify'
import { sender } from '@server/notify/email'
import {
	buildMessage,
	toDiscord,
	toHtml,
	toJson,
	toSlack,
	toText,
	type AlertMessage
} from '@server/notify/message'
import { DEFAULT_SETTINGS } from '@shared/settings'

const message: AlertMessage = buildMessage({
	url: 'https://fernhill.coffee/menu',
	alerts: [
		{
			kind: 'ssl-expiring',
			headline: 'SSL certificate expires in 9 days',
			message: 'The SSL certificate expires in 9 days, on 20 October 2026.'
		},
		{
			kind: 'score-drop',
			headline: 'score dropped 7 points',
			message: 'The score dropped 7 points, from 86 (A-) to 79 (B).',
			details: ['New problems: <title> & Meta description.']
		}
	],
	link: { href: 'https://seo.example.com/report/a/compare/b', label: 'See what changed' }
})

describe('buildMessage', () => {
	it('puts the most serious alert first and titles the message after it', () => {
		expect(message.alerts.map((a) => a.kind)).toEqual(['score-drop', 'ssl-expiring'])
		expect(message.title).toBe(
			'fernhill.coffee/menu: score dropped 7 points and SSL certificate expires in 9 days'
		)
		expect(message.tone).toBe('fail')
	})

	it('counts alerts beyond two', () => {
		const three = buildMessage({
			...message,
			title: undefined,
			alerts: [
				...message.alerts,
				{ kind: 'page-back', headline: 'page is back up', message: 'Back.' }
			]
		})
		expect(three.title).toBe('fernhill.coffee/menu: score dropped 7 points and 2 more')
	})
})

describe('message formats', () => {
	it('writes plain text', () => {
		expect(toText(message)).toBe(
			[
				message.title,
				'',
				'• The score dropped 7 points, from 86 (A-) to 79 (B).',
				'   New problems: <title> & Meta description.',
				'• The SSL certificate expires in 9 days, on 20 October 2026.',
				'',
				'See what changed: https://seo.example.com/report/a/compare/b',
				'',
				'Sent by OpenSEO about https://fernhill.coffee/menu'
			].join('\n')
		)
	})

	it('escapes HTML in emails', () => {
		const html = toHtml(message)
		expect(html).toContain('New problems: &lt;title&gt; &amp; Meta description.')
		expect(html).toContain('href="https://seo.example.com/report/a/compare/b"')
		expect(html).not.toContain('<title>')
	})

	it('escapes Slack markup and links with its own syntax', () => {
		const text = JSON.stringify(toSlack(message))
		expect(text).toContain('&lt;title&gt; &amp; Meta description.')
		expect(text).toContain('<https://seo.example.com/report/a/compare/b|See what changed>')
	})

	it('builds a Discord embed that never mentions anyone', () => {
		const payload = toDiscord(message) as {
			allowed_mentions: unknown
			embeds: { color: number; description: string }[]
		}
		expect(payload.allowed_mentions).toEqual({ parse: [] })
		expect(payload.embeds[0].color).toBe(0xd8344d)
		expect(payload.embeds[0].description).toContain(
			'[See what changed](https://seo.example.com/report/a/compare/b)'
		)
	})

	it('sends the whole message as JSON, with a text version for chat tools', () => {
		expect(toJson(message)).toMatchObject({
			event: 'openseo.alert',
			severity: 'fail',
			url: 'https://fernhill.coffee/menu',
			link: 'https://seo.example.com/report/a/compare/b',
			text: toText(message)
		})
	})
})

describe('sender', () => {
	it('uses SMTP_FROM, then the SMTP user when it is an address', () => {
		expect(sender('smtp://u:p@smtp.example.com', 'Alerts <seo@fernhill.coffee>')).toBe(
			'Alerts <seo@fernhill.coffee>'
		)
		expect(sender('smtps://alex%40fernhill.coffee:pw@smtp.example.com:465', '')).toBe(
			'OpenSEO <alex@fernhill.coffee>'
		)
		expect(sender('smtp://apikey:pw@smtp.example.com', '')).toBe('OpenSEO <openseo@localhost>')
	})
})

describe('sendAlert', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
	})

	it('reports how each channel took the alert', async () => {
		vi.stubEnv('SMTP_URL', '')
		vi.stubEnv('OPENSEO_ALLOW_PRIVATE', '')
		const fetchMock = vi.fn(async (url: string | URL | Request) =>
			String(url).includes('discord')
				? new Response('Unknown Webhook', { status: 404 })
				: new Response('ok')
		)
		vi.stubGlobal('fetch', fetchMock)
		const deliveries = await sendAlert(testMessage('http://localhost:3000'), {
			...DEFAULT_SETTINGS,
			alertEmails: ['alex@fernhill.coffee'],
			slackWebhookUrl: 'https://hooks.slack.com/services/T/B/x',
			discordWebhookUrl: 'https://discord.com/api/webhooks/1/x',
			webhookUrl: 'http://127.0.0.1:4000/hook'
		})
		expect(deliveries).toEqual([
			{
				channel: 'email',
				ok: false,
				error: "SMTP_URL isn't set, so OpenSEO can't send email."
			},
			{ channel: 'slack', ok: true },
			{
				channel: 'discord',
				ok: false,
				error: 'The webhook answered HTTP 404: Unknown Webhook'
			},
			{
				channel: 'webhook',
				ok: false,
				error: 'The webhook points to a private address. Set OPENSEO_ALLOW_PRIVATE=true to allow it.'
			}
		])
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('sends nothing when no channel is set up', async () => {
		expect(await sendAlert(testMessage('http://localhost:3000'), DEFAULT_SETTINGS)).toEqual([])
	})
})
