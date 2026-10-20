/** Light, dark, or whatever the visitor's system uses. */
export type ThemeSetting = 'light' | 'dark' | 'system'

/** Everything that can be changed on the Settings page. */
export interface Settings {
	theme: ThemeSetting
	/** Shown on reports and in the browser tab. */
	brandName: string
	/** A URL or data URI for the logo on reports. Empty uses the OpenSEO mark. */
	brandLogo: string
	/** Hex color used for buttons and highlights on reports. */
	brandColor: string
	/** A line at the foot of every report, like contact details. */
	reportFooter: string
	/** A call to action on reports, like "Book a free SEO call". Empty hides it. */
	ctaText: string
	ctaUrl: string
	pagespeedEnabled: boolean
	/** Stored here unless PAGESPEED_API_KEY is set. Never sent back to the browser. */
	pagespeedApiKey: string
	brokenLinkLimit: number
	crawlPageLimit: number
	/** Who gets monitor alerts by email. Sending needs SMTP_URL. */
	alertEmails: string[]
	/** A Slack incoming webhook for alerts. Never sent back to the browser. */
	slackWebhookUrl: string
	/** A Discord channel webhook for alerts. Never sent back to the browser. */
	discordWebhookUrl: string
	/** Any address that should get each alert as JSON. Never sent back to the browser. */
	webhookUrl: string
	/** The address people open OpenSEO at, so links in alerts work. */
	appUrl: string
}

/** Settings that are secrets: saved, but never sent back to the browser. */
export type SecretSetting =
	'pagespeedApiKey' | 'slackWebhookUrl' | 'discordWebhookUrl' | 'webhookUrl'

/** Settings as the browser sees them: each secret is replaced by whether it's set. */
export type PublicSettings = Omit<Settings, SecretSetting> & {
	hasPagespeedKey: boolean
	pagespeedKeyFromEnv: boolean
	hasSlackWebhook: boolean
	hasDiscordWebhook: boolean
	hasWebhook: boolean
	/** SMTP_URL is set, so alert emails can go out. */
	emailReady: boolean
}

export const DEFAULT_BRAND_COLOR = '#c8f135'

export const THEME_SETTINGS: ThemeSetting[] = ['light', 'dark', 'system']

export const DEFAULT_SETTINGS: Settings = {
	theme: 'light',
	brandName: 'OpenSEO',
	brandLogo: '',
	brandColor: DEFAULT_BRAND_COLOR,
	reportFooter: '',
	ctaText: '',
	ctaUrl: '',
	pagespeedEnabled: false,
	pagespeedApiKey: '',
	brokenLinkLimit: 40,
	crawlPageLimit: 100,
	alertEmails: [],
	slackWebhookUrl: '',
	discordWebhookUrl: '',
	webhookUrl: '',
	appUrl: ''
}

/** What each webhook address must look like, and what to say when it doesn't. */
export const WEBHOOK_FORMATS: Record<
	Exclude<SecretSetting, 'pagespeedApiKey'>,
	{ pattern: RegExp; hint: string }
> = {
	slackWebhookUrl: {
		pattern: /^https:\/\/hooks\.slack\.com\/(services|triggers|workflows)\/\S+$/,
		hint: 'A Slack webhook address starts with https://hooks.slack.com/.'
	},
	discordWebhookUrl: {
		pattern:
			/^https:\/\/(ptb\.|canary\.)?discord(app)?\.com\/api\/(v\d+\/)?webhooks\/\d+\/[\w-]+$/,
		hint: 'A Discord webhook address starts with https://discord.com/api/webhooks/.'
	},
	webhookUrl: {
		pattern: /^https?:\/\/\S+$/,
		hint: 'Enter a full address starting with https://.'
	}
}

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

/** Splits typed addresses ("a@x.com, b@y.com") into valid ones and the rest. */
export function parseEmails(text: string): { emails: string[]; invalid: string[] } {
	const parts = text.split(/[\s,;]+/).filter(Boolean)

	return {
		emails: [...new Set(parts.filter((p) => EMAIL.test(p)).map((p) => p.toLowerCase()))],
		invalid: parts.filter((p) => !EMAIL.test(p))
	}
}

export const BROKEN_LINK_OPTIONS = [
	{ value: 0, label: "Don't check" },
	{ value: 20, label: '20 links' },
	{ value: 40, label: '40 links' },
	{ value: 100, label: '100 links' },
	{ value: 200, label: '200 links' }
]

export const CRAWL_PAGE_OPTIONS = [
	{ value: 25, label: '25 pages' },
	{ value: 50, label: '50 pages' },
	{ value: 100, label: '100 pages' },
	{ value: 250, label: '250 pages' },
	{ value: 500, label: '500 pages' }
]

const MAX_LOGO_LENGTH = 300_000

function text(value: unknown, fallback: string, max = 300): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback
}

function count(value: unknown, fallback: number, max: number): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? Math.min(Math.floor(value), max)
		: fallback
}

function color(value: unknown, fallback: string): string {
	return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
		? value.toLowerCase()
		: fallback
}

function link(value: unknown, fallback: string): string {
	if (typeof value !== 'string') return fallback
	const trimmed = value.trim()

	return trimmed === '' || /^(https?:\/\/|mailto:)/i.test(trimmed)
		? trimmed.slice(0, 500)
		: fallback
}

function emails(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value) || !value.every((v) => typeof v === 'string' && EMAIL.test(v.trim())))
		return fallback

	return [...new Set(value.map((v: string) => v.trim().toLowerCase()))].slice(0, 20)
}

function webhook(value: unknown, fallback: string, pattern: RegExp): string {
	if (typeof value !== 'string') return fallback
	const trimmed = value.trim()

	return trimmed === '' || (trimmed.length <= 500 && pattern.test(trimmed)) ? trimmed : fallback
}

/** A web address without a trailing slash, or empty. */
function origin(value: unknown, fallback: string): string {
	if (typeof value !== 'string') return fallback
	const trimmed = value.trim().replace(/\/+$/, '')
	if (!trimmed) return ''
	try {
		const url = new URL(trimmed)

		return /^https?:$/.test(url.protocol) && trimmed.length <= 300 ? trimmed : fallback
	} catch {
		return fallback
	}
}

function logo(value: unknown, fallback: string): string {
	if (typeof value !== 'string') return fallback
	const trimmed = value.trim()
	const allowed =
		trimmed === '' ||
		/^https?:\/\//i.test(trimmed) ||
		/^data:image\/(png|jpe?g|svg\+xml|webp|gif);base64,/i.test(trimmed)

	return allowed && trimmed.length <= MAX_LOGO_LENGTH ? trimmed : fallback
}

/** Merges untrusted input (the settings file, a request body) over a base, dropping anything invalid. */
export function mergeSettings(base: Settings, input: unknown): Settings {
	const patch = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>

	return {
		theme: THEME_SETTINGS.includes(patch.theme as ThemeSetting)
			? (patch.theme as ThemeSetting)
			: base.theme,
		brandName: text(patch.brandName, base.brandName, 60) || DEFAULT_SETTINGS.brandName,
		brandLogo: logo(patch.brandLogo, base.brandLogo),
		brandColor: color(patch.brandColor, base.brandColor),
		reportFooter: text(patch.reportFooter, base.reportFooter, 300),
		ctaText: text(patch.ctaText, base.ctaText, 60),
		ctaUrl: link(patch.ctaUrl, base.ctaUrl),
		pagespeedEnabled: bool(patch.pagespeedEnabled, base.pagespeedEnabled),
		pagespeedApiKey: text(patch.pagespeedApiKey, base.pagespeedApiKey, 200),
		brokenLinkLimit: count(patch.brokenLinkLimit, base.brokenLinkLimit, 200),
		crawlPageLimit: Math.max(1, count(patch.crawlPageLimit, base.crawlPageLimit, 500)),
		alertEmails: emails(patch.alertEmails, base.alertEmails),
		slackWebhookUrl: webhook(
			patch.slackWebhookUrl,
			base.slackWebhookUrl,
			WEBHOOK_FORMATS.slackWebhookUrl.pattern
		),
		discordWebhookUrl: webhook(
			patch.discordWebhookUrl,
			base.discordWebhookUrl,
			WEBHOOK_FORMATS.discordWebhookUrl.pattern
		),
		webhookUrl: webhook(patch.webhookUrl, base.webhookUrl, WEBHOOK_FORMATS.webhookUrl.pattern),
		appUrl: origin(patch.appUrl, base.appUrl)
	}
}

/** Ink or white, whichever reads better on a background color. */
export function readableTextOn(hex: string): string {
	const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_BRAND_COLOR
	const [r, g, b] = [1, 3, 5].map((i) => {
		const channel = parseInt(value.slice(i, i + 2), 16) / 255

		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

	return luminance > 0.4 ? '#0b1220' : '#ffffff'
}
