const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "Just now", "4 min ago", "3 h ago", "Yesterday", "12 Mar". */
export function relativeTime(iso: string, now: number): string {
	const then = new Date(iso)
	const diff = now - then.getTime()
	if (diff < 45_000) return 'Just now'
	if (diff < HOUR) return `${Math.max(1, Math.round(diff / MINUTE))} min ago`
	if (diff < DAY) return `${Math.round(diff / HOUR)} h ago`
	if (diff < 2 * DAY) return 'Yesterday'
	const sameYear = then.getFullYear() === new Date(now).getFullYear()

	return then.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		...(sameYear ? {} : { year: 'numeric' })
	})
}

export function absoluteDate(iso: string): string {
	return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}
