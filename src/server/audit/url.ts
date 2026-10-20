/** Resolves an href against a page, keeping only http(s) URLs. */
export function resolveUrl(href: string | undefined, base: URL): string | null {
	const value = href?.trim()
	if (!value || value.startsWith('data:') || value.startsWith('blob:')) return null
	try {
		const url = new URL(value, base)

		return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
	} catch {
		return null
	}
}
