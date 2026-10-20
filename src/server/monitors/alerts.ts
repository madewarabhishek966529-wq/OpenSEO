import { displayUrl, formatCount, formatList } from '@shared/format'
import type { Alert, AlertRules, MonitorState } from '@shared/monitors'

/** An SSL certificate as one TLS handshake saw it. */
export interface CertificateStatus {
	/** Browsers would trust it. */
	ok: boolean
	error?: string
	validTo?: string
	daysLeft?: number
}

/** What one run found, for deciding which alerts to send. */
export interface RunOutcome {
	/** The monitored page, or where it redirected to. */
	url: string
	/** The new audit, when the page loaded. */
	report?: { score: number; grade: string }
	/** Why the page didn't load. */
	error?: string
	/** The last successful run before this one. */
	previous?: { score: number; grade: string }
	/** Checks that passed last time and fail or need work now, by title. */
	newProblems?: string[]
	certificate?: CertificateStatus
}

/** Warnings sent again as an expiring certificate gets closer, after the first one. */
const SSL_REMINDERS = [7, 3, 1]

/** How many new problems an alert names before saying "and N more". */
const MAX_NAMED = 6

function expiryDate(validTo: string): string {
	const date = new Date(validTo)

	return Number.isNaN(date.getTime())
		? validTo
		: date.toLocaleDateString('en-GB', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC'
			})
}

function scoreDropAlert(outcome: RunOutcome, drop: number): Alert {
	const { report, previous, newProblems = [] } = outcome
	const points = formatCount(drop, 'point')
	const named = newProblems.slice(0, MAX_NAMED)
	const more = newProblems.length - named.length

	return {
		kind: 'score-drop',
		headline: `score dropped ${points}`,
		message: `The score dropped ${points}, from ${previous?.score} (${previous?.grade}) to ${report?.score} (${report?.grade}).`,
		details: named.length
			? [`New problems: ${formatList(more ? [...named, `${more} more`] : named)}.`]
			: undefined
	}
}

function certificateAlert(
	rules: AlertRules,
	state: MonitorState,
	certificate: CertificateStatus
): { alert: Alert; warned: string } | null {
	const { ok, error, validTo = '', daysLeft } = certificate
	if (!ok) {
		const warned = `${validTo}|invalid`
		if (state.sslWarned === warned) return null

		return {
			warned,
			alert: {
				kind: 'ssl-invalid',
				headline: "SSL certificate isn't valid",
				message: `The SSL certificate isn't valid: ${error || "browsers won't trust it"}.`
			}
		}
	}
	if (daysLeft === undefined || daysLeft > rules.sslDays) return null
	// The closest threshold passed so far: warn at the rule's day count, then at 7, 3 and 1.
	const thresholds = [rules.sslDays, ...SSL_REMINDERS].filter(
		(days) => days <= rules.sslDays && daysLeft <= days
	)
	const warned = `${validTo}|${Math.min(...thresholds)}`
	if (state.sslWarned === warned) return null
	const when = daysLeft <= 0 ? 'today' : `in ${formatCount(daysLeft, 'day')}`

	return {
		warned,
		alert: {
			kind: 'ssl-expiring',
			headline: `SSL certificate expires ${when}`,
			message: `The SSL certificate expires ${when}, on ${expiryDate(validTo)}. Renew it, or check that automatic renewal works.`
		}
	}
}

/**
 * Decides which alerts a run sends, and what to remember so the same news goes out once: the
 * page going down and coming back, the score dropping since the last run, and an SSL certificate
 * that's invalid or about to expire (warned again at 7, 3 and 1 days).
 */
export function evaluateAlerts(
	rules: AlertRules,
	state: MonitorState,
	outcome: RunOutcome
): { alerts: Alert[]; state: MonitorState } {
	const alerts: Alert[] = []
	const next: MonitorState = { ...state }
	const site = displayUrl(outcome.url)

	if (outcome.error) {
		if (!state.down && rules.pageDown) {
			alerts.push({
				kind: 'page-down',
				headline: 'page is down',
				message: `${site} didn't load: ${outcome.error}`
			})
		}
		next.down = true
	} else if (state.down) {
		if (rules.pageDown) {
			const score = outcome.report
				? ` and scores ${outcome.report.score} (${outcome.report.grade})`
				: ''
			alerts.push({
				kind: 'page-back',
				headline: 'page is back up',
				message: `${site} loads again${score}.`
			})
		}
		next.down = false
	}

	const { report, previous } = outcome
	const drop = report && previous ? previous.score - report.score : 0
	if (rules.scoreDrop > 0 && drop >= rules.scoreDrop) alerts.push(scoreDropAlert(outcome, drop))

	if (outcome.certificate?.validTo && rules.sslDays > 0) {
		const found = certificateAlert(rules, state, outcome.certificate)
		if (found) {
			alerts.push(found.alert)
			next.sslWarned = found.warned
		}
	}

	return { alerts, state: next }
}
