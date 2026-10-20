import { AuditError, runAudit } from '@server/audit'
import { assertPublicHost } from '@server/audit/http'
import { inspectTls } from '@server/audit/network'
import { withSlot } from '@server/limits'
import { buildMessage, sendAlert, type AlertMessage } from '@server/notify'
import { appUrl, pagespeedConfig } from '@server/settings'
import { processWide } from '@server/process-wide'
import { getMonitor, getReport, getSettings, saveReport, updateMonitor } from '@server/store'
import { checksOfKind, compareReports, type ReportComparison } from '@shared/compare'
import { MAX_RUNS, nextRunAt, type Alert, type MonitorRun } from '@shared/monitors'
import type { Settings } from '@shared/settings'
import type { AuditProgress, AuditReport } from '@shared/types'
import { evaluateAlerts, type CertificateStatus } from './alerts'

/** Failures that retrying can't fix. Anything else gets one more try before the page counts as down. */
const NO_RETRY = ['invalid_url', 'private_host', 'protocol', 'not_html']

const RETRY_DELAY_MS = 30_000

/** Monitors running right now, so a scheduled run and "Run now" never overlap. */
const running = processWide('running-monitors', () => new Set<string>())

export class MonitorBusyError extends Error {}

export interface RunOptions {
	onProgress?(progress: AuditProgress): void
	/** Started by hand: the schedule stays as it is, unless the next run was due anyway. */
	manual?: boolean
	/** How long to wait before trying a page that didn't load again. */
	retryDelayMs?: number
}

export function isRunning(id: string): boolean {
	return running.has(id)
}

async function auditWithRetry(
	url: string,
	settings: Settings,
	options: RunOptions
): Promise<AuditReport> {
	const audit = () =>
		withSlot(() =>
			runAudit(url, {
				source: 'monitor',
				onProgress: options.onProgress,
				pagespeed: pagespeedConfig(settings),
				brokenLinkLimit: settings.brokenLinkLimit
			})
		)
	try {
		return await audit()
	} catch (e) {
		if (!(e instanceof AuditError) || NO_RETRY.includes(e.code)) throw e
		options.onProgress?.({ step: 'retry', label: "The page didn't load. Trying again", pct: 2 })
		await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs ?? RETRY_DELAY_MS))

		return audit()
	}
}

/** The SSL certificate of an HTTPS page. Nothing for HTTP pages or hosts we can't reach. */
async function checkCertificate(url: string): Promise<CertificateStatus | undefined> {
	const target = new URL(url)
	if (target.protocol !== 'https:') return undefined
	try {
		await assertPublicHost(target.hostname)
	} catch {
		return undefined
	}
	const tls = await inspectTls(target.hostname, Number(target.port) || 443)

	return tls.validTo
		? { ok: tls.ok, error: tls.error, validTo: tls.validTo, daysLeft: tls.daysLeft }
		: undefined
}

/** Where an alert should send people: what changed, the new report, or the monitors. */
function linkFor(
	base: string,
	alerts: Alert[],
	report?: AuditReport,
	comparison?: ReportComparison
): AlertMessage['link'] {
	if (comparison && alerts.some((a) => a.kind === 'score-drop')) {
		return {
			href: `${base}/report/${comparison.a.id}/compare/${comparison.b.id}`,
			label: 'See what changed'
		}
	}
	if (report) return { href: `${base}/report/${report.id}`, label: 'Open the report' }

	return { href: `${base}/monitors`, label: 'Open your monitors' }
}

/**
 * Audits a monitored page, checks its SSL certificate, sends the alerts the monitor's rules call
 * for, and records the run. The report goes to History like any other audit. Returns null when
 * the monitor no longer exists.
 */
export async function runMonitor(id: string, options: RunOptions = {}): Promise<MonitorRun | null> {
	if (running.has(id)) throw new MonitorBusyError('This monitor is running already.')
	running.add(id)
	try {
		const monitor = await getMonitor(id)
		if (!monitor) return null
		const settings = await getSettings()
		const at = new Date().toISOString()
		let report: AuditReport | undefined
		let error: string | undefined
		try {
			report = await auditWithRetry(monitor.url, settings, options)
			await saveReport(report)
		} catch (e) {
			if (!(e instanceof AuditError)) console.error(`[monitors] ${monitor.url}:`, e)
			error = e instanceof AuditError ? e.message : 'The audit failed.'
		}

		const page = report?.finalUrl ?? monitor.url
		const certificate = await checkCertificate(page)
		const last = monitor.runs.find((r) => r.ok && r.score !== undefined)
		const previous = report && last?.reportId ? await getReport(last.reportId) : null
		const comparison = report && previous ? compareReports(previous, report) : undefined
		const { alerts, state } = evaluateAlerts(monitor.alerts, monitor.state, {
			url: page,
			report,
			error,
			previous: last && { score: last.score ?? 0, grade: last.grade ?? '' },
			newProblems: comparison && [
				...checksOfKind(comparison, 'new-problem').map((c) => c.title),
				...checksOfKind(comparison, 'worse').map((c) => c.title)
			],
			certificate
		})
		const deliveries = alerts.length
			? await sendAlert(
					buildMessage({
						url: page,
						alerts,
						link: linkFor(appUrl(settings), alerts, report, comparison),
						monitorId: monitor.id,
						report: report && {
							id: report.id,
							score: report.score,
							grade: report.grade
						}
					}),
					settings
				)
			: []

		// What the alerts said is remembered only once a channel took them, so when every
		// channel failed (or none is set up) the next run says it again.
		const heard = !alerts.length || deliveries.some((d) => d.ok)
		const run: MonitorRun = {
			at,
			ok: !error,
			reportId: report?.id,
			score: report?.score,
			grade: report?.grade,
			error,
			sslDaysLeft: certificate?.daysLeft,
			alerts,
			deliveries
		}
		await updateMonitor(id, (current) => {
			const keep = options.manual && new Date(current.nextRunAt).getTime() > Date.now()

			return {
				...current,
				runs: [run, ...current.runs].slice(0, MAX_RUNS),
				state: heard ? state : current.state,
				nextRunAt: keep
					? current.nextRunAt
					: nextRunAt(current.schedule, new Date()).toISOString()
			}
		})

		return run
	} finally {
		running.delete(id)
	}
}
