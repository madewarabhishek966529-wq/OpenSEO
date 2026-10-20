import type { PublicSettings, Settings } from '@shared/settings'
import { getSettings } from './store'

/** The PageSpeed key from the environment wins over the one saved in Settings. */
export function pagespeedConfig(settings: Settings): { enabled: boolean; apiKey?: string } {
	const apiKey = process.env.PAGESPEED_API_KEY || settings.pagespeedApiKey || undefined

	return { enabled: settings.pagespeedEnabled, apiKey }
}

export function toPublicSettings(settings: Settings): PublicSettings {
	const { pagespeedApiKey, slackWebhookUrl, discordWebhookUrl, webhookUrl, ...rest } = settings

	return {
		...rest,
		hasPagespeedKey: Boolean(process.env.PAGESPEED_API_KEY || pagespeedApiKey),
		pagespeedKeyFromEnv: Boolean(process.env.PAGESPEED_API_KEY),
		hasSlackWebhook: Boolean(slackWebhookUrl),
		hasDiscordWebhook: Boolean(discordWebhookUrl),
		hasWebhook: Boolean(webhookUrl),
		emailReady: Boolean(process.env.SMTP_URL)
	}
}

/** The address links in alerts point to: the one set in Settings, or this server on localhost. */
export function appUrl(settings: Settings): string {
	return settings.appUrl || `http://localhost:${process.env.PORT || 3000}`
}

export async function getPublicSettings(): Promise<PublicSettings> {
	return toPublicSettings(await getSettings())
}
