import type { MonitorRun } from '@shared/monitors'
import type { TrendPoint } from '@web/components/trend-line'

/** The scores of the runs that loaded the page, oldest first. */
export function trendOf(runs: MonitorRun[]): TrendPoint[] {
	return runs
		.filter((run) => run.ok && run.score !== undefined)
		.map((run) => ({ date: run.at, score: run.score ?? 0 }))
		.reverse()
}
