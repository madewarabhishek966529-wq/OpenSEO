import type { MonitorRun } from '@shared/monitors'

export interface RunListProps {
	/** Newest first. */
	runs: MonitorRun[]
	/** The monitor's time zone, for the times of the runs. */
	timeZone: string
}
