/** Whether an address can be saved: empty, or a full http(s) address. */
export function isWebAddress(value: string): boolean {
	if (!value) return true
	try {
		return /^https?:$/.test(new URL(value).protocol)
	} catch {
		return false
	}
}
