import { formatList } from '@shared/format'

/** "\"alex@\" isn't an email address." */
export function invalidMessage(invalid: string[]): string {
	const quoted = formatList(invalid.map((value) => `"${value}"`))

	return invalid.length === 1
		? `${quoted} isn't an email address.`
		: `${quoted} aren't email addresses.`
}
