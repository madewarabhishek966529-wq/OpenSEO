import type { MonitorRun } from '@shared/monitors'

export interface RunRowProps {
	run: MonitorRun
	/** The run before it that loaded the page, to show how the score moved. */
	previous?: MonitorRun
	timeZone: string
}
