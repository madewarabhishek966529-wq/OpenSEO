import { WEBHOOK_FORMATS, type SecretSetting } from '@shared/settings'

/** What's wrong with a typed value, or null when it can be saved. API keys aren't checked. */
export function problemWith(setting: SecretSetting, value: string): string | null {
	if (setting === 'pagespeedApiKey') return null
	const format = WEBHOOK_FORMATS[setting]

	return format.pattern.test(value) ? null : format.hint
}
