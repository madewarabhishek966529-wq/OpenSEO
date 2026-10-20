import type { MonitorRun } from '@shared/monitors'

export interface LastRunProps {
	/** Newest first. */
	runs: MonitorRun[]
	now: number
}
