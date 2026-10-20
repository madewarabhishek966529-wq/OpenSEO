import { displayUrl, formatList, truncate } from '@shared/format'
import type { Alert, AlertKind } from '@shared/monitors'

/** Alerts ready to send: what happened, to which page, and where to read more. */
export interface AlertMessage {
	/** "fernhill.coffee: score dropped 7 points". Also the email subject. */
	title: string
	/** The most serious first. */
	alerts: Alert[]
	/** The page the alerts are about. */
	url: string
	link?: { href: string; label: string }
	tone: 'fail' | 'warn' | 'pass'
	monitorId?: string
	report?: { id: string; score: number; grade: string }
}

export type MessageInput = Omit<AlertMessage, 'title' | 'tone'> & { title?: string }

/** The order alerts are listed in, most serious first. */
const RANK: AlertKind[] = [
	'page-down',
	'ssl-invalid',
	'score-drop',
	'ssl-expiring',
	'page-back',
	'test'
]

const TONES: Record<AlertKind, AlertMessage['tone']> = {
	'page-down': 'fail',
	'ssl-invalid': 'fail',
	'score-drop': 'fail',
	'ssl-expiring': 'warn',
	'page-back': 'pass',
	test: 'pass'
}

const COLORS: Record<AlertMessage['tone'], string> = {
	fail: '#d8344d',
	warn: '#d99100',
	pass: '#13935a'
}

/** Puts the alerts in order and writes a title from the most serious ones. */
export function buildMessage(input: MessageInput): AlertMessage {
	const alerts = [...input.alerts].sort((a, b) => RANK.indexOf(a.kind) - RANK.indexOf(b.kind))
	const headlines = alerts.map((a) => a.headline)
	const shown = headlines.length > 2 ? [headlines[0], `${headlines.length - 1} more`] : headlines

	return {
		...input,
		alerts,
		title: input.title ?? `${displayUrl(input.url)}: ${formatList(shown)}`,
		tone: TONES[alerts[0]?.kind ?? 'test']
	}
}

/** Each alert as a bullet, with its details indented under it, formatted for the channel. */
function bullets(
	message: AlertMessage,
	format: { text?: (text: string) => string; detail?: (text: string) => string } = {}
): string[] {
	const text = format.text ?? ((value: string) => value)
	const detail = format.detail ?? text

	return message.alerts.flatMap((alert) => [
		`• ${text(alert.message)}`,
		...(alert.details ?? []).map((value) => `   ${detail(value)}`)
	])
}

export function toText(message: AlertMessage): string {
	const link = message.link ? ['', `${message.link.label}: ${message.link.href}`] : []

	return [
		message.title,
		'',
		...bullets(message),
		...link,
		'',
		`Sent by OpenSEO about ${message.url}`
	].join('\n')
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

/** A plain HTML email with inline styles, which is all most mail apps respect. */
export function toHtml(message: AlertMessage): string {
	const items = message.alerts
		.map((alert) => {
			const details = (alert.details ?? [])
				.map((text) => `<br><span style="color:#697386">${escapeHtml(text)}</span>`)
				.join('')

			return `<li style="margin:0 0 10px">${escapeHtml(alert.message)}${details}</li>`
		})
		.join('')
	const button = message.link
		? `<p style="margin:22px 0 4px"><a href="${escapeHtml(message.link.href)}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0b1220;color:#ffffff;font-weight:600;text-decoration:none">${escapeHtml(message.link.label)}</a></p>`
		: ''

	return [
		'<!doctype html><html><body style="margin:0;padding:24px;background:#eef1f5;color:#0b1220;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">',
		'<div style="max-width:560px;margin:0 auto;padding:24px 26px;border:1px solid #e2e6ed;border-radius:14px;background:#ffffff">',
		`<p style="margin:0 0 6px;color:${COLORS[message.tone]};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">OpenSEO alert</p>`,
		`<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(message.title)}</h1>`,
		`<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.5">${items}</ul>`,
		button,
		`<p style="margin:18px 0 0;color:#697386;font-size:12px">Sent by OpenSEO about ${escapeHtml(message.url)}</p>`,
		'</div></body></html>'
	].join('')
}

/** Slack's mrkdwn treats &, < and > as markup. */
function escapeSlack(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** A Slack incoming webhook payload: a bold title, the alerts and a link. */
export function toSlack(message: AlertMessage): Record<string, unknown> {
	const link = message.link ? [`<${message.link.href}|${escapeSlack(message.link.label)}>`] : []
	const body = [
		`*${escapeSlack(message.title)}*`,
		...bullets(message, {
			text: escapeSlack,
			detail: (text) => `_${escapeSlack(text)}_`
		}),
		...link
	]

	return {
		text: message.title,
		blocks: [
			{ type: 'section', text: { type: 'mrkdwn', text: truncate(body.join('\n'), 2900) } },
			{ type: 'context', elements: [{ type: 'mrkdwn', text: 'Sent by OpenSEO' }] }
		]
	}
}

/** A Discord webhook payload: one embed in the alert's color. Mentions are switched off. */
export function toDiscord(message: AlertMessage): Record<string, unknown> {
	const link = message.link ? ['', `[${message.link.label}](${message.link.href})`] : []

	return {
		username: 'OpenSEO',
		allowed_mentions: { parse: [] },
		embeds: [
			{
				title: truncate(message.title, 256),
				description: truncate(
					[...bullets(message, { detail: (text) => `*${text}*` }), ...link].join('\n'),
					4000
				),
				color: parseInt(COLORS[message.tone].slice(1), 16),
				footer: { text: 'OpenSEO' },
				timestamp: new Date().toISOString()
			}
		]
	}
}

/**
 * The JSON webhook payload. `text` holds the whole message as plain text, so chat tools that
 * read a `text` field (Mattermost, Google Chat, Rocket.Chat) show it as is.
 */
export function toJson(message: AlertMessage): Record<string, unknown> {
	return {
		event: 'openseo.alert',
		title: message.title,
		severity: message.tone,
		url: message.url,
		alerts: message.alerts,
		link: message.link?.href,
		monitorId: message.monitorId,
		report: message.report,
		sentAt: new Date().toISOString(),
		text: toText(message)
	}
}
