import { AuditError, newId } from '@server/audit'
import { assertPublicHost, normalizeInputUrl } from '@server/audit/http'
import { addMonitor, listMonitors } from '@server/store'
import {
	DEFAULT_ALERT_RULES,
	DEFAULT_SCHEDULE,
	mergeAlertRules,
	mergeSchedule,
	nextRunAt,
	type Monitor
} from '@shared/monitors'

/** The most monitors one OpenSEO keeps, so a script can't fill the disk with audits. */
export const MAX_MONITORS = 200

/**
 * Starts watching a page. Without a schedule it runs every day at 06:00 UTC; without alert rules
 * it alerts on a 5-point drop, the page going down and an SSL certificate 14 days before it
 * expires. Throws AuditError, with a message to show, for an address it can't monitor.
 */
export async function createMonitor(input: {
	url?: unknown
	schedule?: unknown
	alerts?: unknown
}): Promise<Monitor> {
	const url = normalizeInputUrl(typeof input.url === 'string' ? input.url : '')
	await assertPublicHost(new URL(url).hostname)
	if ((await listMonitors()).length >= MAX_MONITORS) {
		throw new AuditError(`OpenSEO keeps up to ${MAX_MONITORS} monitors.`, 'limit')
	}
	const schedule = mergeSchedule(DEFAULT_SCHEDULE, input.schedule)
	const monitor: Monitor = {
		id: newId(),
		url,
		createdAt: new Date().toISOString(),
		paused: false,
		schedule,
		alerts: mergeAlertRules(DEFAULT_ALERT_RULES, input.alerts),
		nextRunAt: nextRunAt(schedule, new Date()).toISOString(),
		runs: [],
		state: { down: false }
	}
	await addMonitor(monitor)

	return monitor
}
