import { formatList } from '@shared/format'
import { CHANNEL_NAMES, type MonitorRun } from '@shared/monitors'

/** Where a run's alerts went: "Sent to Email and Slack", or what failed. */
export function deliveryNote(run: MonitorRun): { text: string; ok: boolean } {
	if (!run.deliveries.length) return { text: 'Not sent: no alert channels set up', ok: false }
	const sent = run.deliveries.filter((d) => d.ok).map((d) => CHANNEL_NAMES[d.channel])
	const failed = run.deliveries
		.filter((d) => !d.ok)
		.map((d) => `${CHANNEL_NAMES[d.channel]} failed (${d.error})`)
	const parts = [sent.length ? `Sent to ${formatList(sent)}` : '', ...failed].filter(Boolean)

	return { text: parts.join('. '), ok: failed.length === 0 }
}

/** "Score dropped 7 points". */
export function sentenceCase(text: string): string {
	return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}
