/** How often a monitor audits its page. */
export type MonitorFrequency = 'daily' | 'weekly'

export interface MonitorSchedule {
	frequency: MonitorFrequency
	/** The hour it runs, 0–23, in `timeZone`. */
	hour: number
	/** The day a weekly monitor runs, 0 (Sunday) to 6 (Saturday). */
	weekday: number
	/** An IANA time zone, like Europe/Zurich. */
	timeZone: string
}

/** When a monitor sends an alert. */
export interface AlertRules {
	/** Points the score may fall from one run to the next before an alert. 0 turns it off. */
	scoreDrop: number
	/** When the page stops loading, and when it's back. */
	pageDown: boolean
	/** How many days before the SSL certificate expires to warn. 0 turns SSL alerts off. */
	sslDays: number
}

export type AlertKind =
	'score-drop' | 'page-down' | 'page-back' | 'ssl-expiring' | 'ssl-invalid' | 'test'

export interface Alert {
	kind: AlertKind
	/** A few words for subject lines: "score dropped 7 points". */
	headline: string
	/** One sentence saying what happened. */
	message: string
	/** Supporting lines, like the checks that started failing. */
	details?: string[]
}

export type ChannelId = 'email' | 'slack' | 'discord' | 'webhook'

/** Whether an alert reached one channel. */
export interface Delivery {
	channel: ChannelId
	ok: boolean
	error?: string
}

/** One scheduled (or "Run now") audit of a monitored page. */
export interface MonitorRun {
	at: string
	/** The page loaded and was audited. When false, `error` says why. */
	ok: boolean
	reportId?: string
	score?: number
	grade?: string
	error?: string
	/** Days until the SSL certificate expires, when the page is on HTTPS. */
	sslDaysLeft?: number
	alerts: Alert[]
	deliveries: Delivery[]
}

/** What a monitor already alerted about, so the same news isn't sent on every run. */
export interface MonitorState {
	/** The last run couldn't load the page. */
	down: boolean
	/** The certificate and the warning last sent about it, like "Nov 8 01:36:56 2026 GMT|14". */
	sslWarned?: string
}

export interface Monitor {
	id: string
	url: string
	createdAt: string
	paused: boolean
	schedule: MonitorSchedule
	alerts: AlertRules
	nextRunAt: string
	/** Newest first, the last MAX_RUNS. */
	runs: MonitorRun[]
	state: MonitorState
}

/** Where alerts go, without the webhook addresses, for the screens to show. */
export interface AlertTargets {
	emails: string[]
	/** SMTP_URL is set, so email can be sent. */
	emailReady: boolean
	slack: boolean
	discord: boolean
	webhook: boolean
}

/** Runs kept per monitor. Their reports stay in History either way. */
export const MAX_RUNS = 30

export const DEFAULT_SCHEDULE: MonitorSchedule = {
	frequency: 'daily',
	hour: 6,
	weekday: 1,
	timeZone: 'UTC'
}

export const DEFAULT_ALERT_RULES: AlertRules = { scoreDrop: 5, pageDown: true, sslDays: 14 }

export const FREQUENCY_OPTIONS: { value: MonitorFrequency; label: string }[] = [
	{ value: 'daily', label: 'Every day' },
	{ value: 'weekly', label: 'Every week' }
]

export const WEEKDAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
]

/** Monday first, as calendars in most of the world start. */
export const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((value) => ({
	value,
	label: `on ${WEEKDAY_NAMES[value]}`
}))

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, value) => ({
	value,
	label: `at ${formatHour(value)}`
}))

export const SCORE_DROP_OPTIONS = [
	{ value: 0, label: "Don't alert" },
	{ value: 1, label: 'By 1 point or more' },
	{ value: 3, label: 'By 3 points or more' },
	{ value: 5, label: 'By 5 points or more' },
	{ value: 10, label: 'By 10 points or more' }
]

export const SSL_DAYS_OPTIONS = [
	{ value: 0, label: "Don't alert" },
	{ value: 7, label: 'Warn 7 days before' },
	{ value: 14, label: 'Warn 14 days before' },
	{ value: 30, label: 'Warn 30 days before' }
]

export const CHANNEL_NAMES: Record<ChannelId, string> = {
	email: 'Email',
	slack: 'Slack',
	discord: 'Discord',
	webhook: 'Webhook'
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SHORT_MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
]

/**
 * "Mon 12 Oct, 06:00" on the clocks of the time zone. Assembled from numbers rather than a
 * locale format, because browsers and Node word dates slightly differently, and the page is
 * rendered by both.
 */
export function formatInZone(iso: string, timeZone: string): string {
	const wall = wallTime(new Date(iso), isTimeZone(timeZone) ? timeZone : 'UTC')
	const weekday = new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay()
	const time = `${String(wall.hour).padStart(2, '0')}:${String(wall.minute).padStart(2, '0')}`

	return `${SHORT_WEEKDAYS[weekday]} ${wall.day} ${SHORT_MONTHS[wall.month - 1]}, ${time}`
}

/** Where alerts go, as people would say it: "alex@fernhill.coffee, Slack and a webhook". */
export function alertTargetNames(targets: AlertTargets): string[] {
	return [
		...targets.emails,
		targets.slack && 'Slack',
		targets.discord && 'Discord',
		targets.webhook && 'a webhook'
	].filter((name): name is string => Boolean(name))
}

/** "06:00". */
export function formatHour(hour: number): string {
	return `${String(hour).padStart(2, '0')}:00`
}

/** "Daily at 06:00" or "Mondays at 09:00". */
export function describeSchedule(schedule: MonitorSchedule): string {
	const time = formatHour(schedule.hour)

	return schedule.frequency === 'daily'
		? `Daily at ${time}`
		: `${WEEKDAY_NAMES[schedule.weekday]}s at ${time}`
}

export function isTimeZone(value: unknown): value is string {
	if (typeof value !== 'string' || !value) return false
	try {
		return Boolean(new Intl.DateTimeFormat('en-US', { timeZone: value }))
	} catch {
		return false
	}
}

function record(input: unknown): Record<string, unknown> {
	return input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
}

function whole(value: unknown, min: number, max: number, fallback: number): number {
	return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
		? value
		: fallback
}

/** Merges untrusted input (a request body) over a schedule, dropping anything invalid. */
export function mergeSchedule(base: MonitorSchedule, input: unknown): MonitorSchedule {
	const patch = record(input)

	return {
		frequency:
			patch.frequency === 'daily' || patch.frequency === 'weekly'
				? patch.frequency
				: base.frequency,
		hour: whole(patch.hour, 0, 23, base.hour),
		weekday: whole(patch.weekday, 0, 6, base.weekday),
		timeZone: isTimeZone(patch.timeZone) ? patch.timeZone : base.timeZone
	}
}

/** Merges untrusted input over alert rules, dropping anything invalid. */
export function mergeAlertRules(base: AlertRules, input: unknown): AlertRules {
	const patch = record(input)

	return {
		scoreDrop: whole(patch.scoreDrop, 0, 100, base.scoreDrop),
		pageDown: typeof patch.pageDown === 'boolean' ? patch.pageDown : base.pageDown,
		sslDays: whole(patch.sslDays, 0, 365, base.sslDays)
	}
}

interface WallTime {
	year: number
	month: number
	day: number
	hour: number
	minute: number
}

const clocks = new Map<string, Intl.DateTimeFormat>()

/** What a clock in the time zone shows at that moment. */
function wallTime(date: Date, timeZone: string): WallTime {
	let clock = clocks.get(timeZone)
	if (!clock) {
		clock = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric'
		})
		clocks.set(timeZone, clock)
	}
	const parts = Object.fromEntries(clock.formatToParts(date).map((p) => [p.type, p.value]))

	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute)
	}
}

/** How far the time zone's clocks are ahead of UTC at that moment, in milliseconds. */
function offsetAt(time: number, timeZone: string): number {
	const wall = wallTime(new Date(time), timeZone)
	const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute)

	return wallAsUtc - (time - (time % 60_000))
}

/**
 * The moment clocks in a time zone show a date and hour. When daylight saving makes that hour
 * happen twice, it's the first time; when it skips the hour, it's right after the jump, when the
 * clocks show the next hour.
 */
export function zonedTime(
	year: number,
	month: number,
	day: number,
	hour: number,
	timeZone: string
): Date {
	const asUtc = Date.UTC(year, month - 1, day, hour)
	// Each guess corrects the last by the zone's offset at it; three cover any change of offset.
	const first = asUtc - offsetAt(asUtc, timeZone)
	const second = asUtc - offsetAt(first, timeZone)
	const third = asUtc - offsetAt(second, timeZone)
	const guesses = [...new Set([first, second, third])].sort((a, b) => a - b)
	const exact = guesses.find((time) => {
		const wall = wallTime(new Date(time), timeZone)

		return wall.year === year && wall.month === month && wall.day === day && wall.hour === hour
	})

	return new Date(exact ?? guesses[guesses.length - 1])
}

/** When a monitor on this schedule runs next, strictly after `after`. */
export function nextRunAt(schedule: MonitorSchedule, after: Date): Date {
	const today = wallTime(after, schedule.timeZone)
	for (let offset = 0; offset <= 8; offset++) {
		const day = new Date(Date.UTC(today.year, today.month - 1, today.day + offset))
		if (schedule.frequency === 'weekly' && day.getUTCDay() !== schedule.weekday) continue
		const at = zonedTime(
			day.getUTCFullYear(),
			day.getUTCMonth() + 1,
			day.getUTCDate(),
			schedule.hour,
			schedule.timeZone
		)
		if (at.getTime() > after.getTime()) return at
	}

	// Every week has the weekday, so this only guards against a broken time zone.
	return new Date(after.getTime() + 24 * 60 * 60 * 1000)
}
