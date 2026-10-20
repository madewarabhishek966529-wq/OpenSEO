import { AuditError, assertPublicHost } from '@server/audit/http'
import type { AlertTargets, ChannelId, Delivery } from '@shared/monitors'
import type { Settings } from '@shared/settings'
import { emailReady, sendEmail } from './email'
import { buildMessage, toDiscord, toJson, toSlack, type AlertMessage } from './message'

export { buildMessage, type AlertMessage } from './message'

const TIMEOUT_MS = 10_000

/** Where alerts go, without the webhook addresses. */
export function alertTargets(settings: Settings): AlertTargets {
	return {
		emails: settings.alertEmails,
		emailReady: emailReady(),
		slack: Boolean(settings.slackWebhookUrl),
		discord: Boolean(settings.discordWebhookUrl),
		webhook: Boolean(settings.webhookUrl)
	}
}

/** The JSON webhook may not point into a private network unless OPENSEO_ALLOW_PRIVATE is on. */
async function assertPublicWebhook(url: string): Promise<void> {
	try {
		await assertPublicHost(new URL(url).hostname)
	} catch (e) {
		if (e instanceof AuditError && e.code === 'private_host') {
			throw new Error(
				'The webhook points to a private address. Set OPENSEO_ALLOW_PRIVATE=true to allow it.'
			)
		}
		throw e
	}
}

/** Posts JSON to a webhook. Redirects count as failures, so a webhook can't bounce elsewhere. */
async function postJson(url: string, body: unknown): Promise<void> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'user-agent': 'OpenSEO' },
		body: JSON.stringify(body),
		redirect: 'manual',
		signal: AbortSignal.timeout(TIMEOUT_MS)
	})
	if (res.ok) return
	const text = (await res.text().catch(() => '')).trim().slice(0, 140)
	throw new Error(`The webhook answered HTTP ${res.status}${text ? `: ${text}` : ''}`)
}

async function deliver(channel: ChannelId, send: () => Promise<void>): Promise<Delivery> {
	try {
		await send()

		return { channel, ok: true }
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e)

		return { channel, ok: false, error: error.replace(/^Error: /, '') }
	}
}

/** Sends a message to every channel set up in Settings, all at once, and reports how each went. */
export async function sendAlert(message: AlertMessage, settings: Settings): Promise<Delivery[]> {
	const { alertEmails, slackWebhookUrl, discordWebhookUrl, webhookUrl } = settings
	const jobs: Promise<Delivery>[] = []
	if (alertEmails.length) jobs.push(deliver('email', () => sendEmail(alertEmails, message)))
	if (slackWebhookUrl) {
		jobs.push(deliver('slack', () => postJson(slackWebhookUrl, toSlack(message))))
	}
	if (discordWebhookUrl) {
		jobs.push(deliver('discord', () => postJson(discordWebhookUrl, toDiscord(message))))
	}
	if (webhookUrl) {
		jobs.push(
			deliver('webhook', async () => {
				await assertPublicWebhook(webhookUrl)
				await postJson(webhookUrl, toJson(message))
			})
		)
	}

	return Promise.all(jobs)
}

/** A message to check that alerts arrive, from Settings. */
export function testMessage(appUrl: string): AlertMessage {
	return buildMessage({
		title: 'Test alert from OpenSEO',
		url: appUrl,
		alerts: [
			{
				kind: 'test',
				headline: 'test alert',
				message:
					'Alerts from your monitors will arrive here: when a score drops, a page stops loading or an SSL certificate is about to expire.'
			}
		],
		link: { href: `${appUrl}/monitors`, label: 'Open your monitors' }
	})
}
