import type { MonitorRun } from '@shared/monitors'
import { relativeTime } from '@web/lib/time'

/** "Last run 4 min ago", "Last run yesterday", "Last run 12 Mar". */
export function lastRunLabel(run: MonitorRun, now: number): string {
	const when = relativeTime(run.at, now)

	return `Last run ${when.charAt(0).toLowerCase()}${when.slice(1)}`
}

/** The run before the latest that loaded the page, to show how the score moved. */
export function previousScored(runs: MonitorRun[]): MonitorRun | undefined {
	return runs.slice(1).find((run) => run.ok && run.score !== undefined)
}
