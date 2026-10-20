const number = new Intl.NumberFormat('en-US')
const list = new Intl.ListFormat('en-GB', { style: 'long', type: 'conjunction' })

export function formatNumber(n: number): string {
	return number.format(n)
}

/** "a, b and c". */
export function formatList(items: string[]): string {
	return list.format(items)
}

export function formatCount(n: number, singular: string, plural = `${singular}s`): string {
	return `${number.format(n)} ${n === 1 ? singular : plural}`
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	const units = ['KB', 'MB', 'GB']
	let value = bytes / 1024
	let unit = 0
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024
		unit++
	}

	return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

/** "320 ms" under a second, "1.4 s" above. */
export function formatMs(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)} ms`

	return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`
}

export function formatPercent(part: number, whole: number): string {
	return whole ? `${Math.round((part / whole) * 100)}%` : '0%'
}

/** Shortens text to `max` characters, ending with an ellipsis when it had to cut. */
export function truncate(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/** "example.com › blog › post", the way Google shows a URL in results. */
export function breadcrumbUrl(url: string): string {
	try {
		const u = new URL(url)
		const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent)

		return [u.hostname.replace(/^www\./, ''), ...parts].join(' › ')
	} catch {
		return url
	}
}

/** The URL without the protocol, for compact display. */
export function displayUrl(url: string): string {
	return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
