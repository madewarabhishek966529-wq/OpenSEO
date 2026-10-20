import type { AlertRules, AlertTargets, Monitor, MonitorSchedule } from '@shared/monitors'

export interface MonitorsScreenProps {
	monitors: Monitor[]
	targets: AlertTargets
	/** Every time zone the server knows, for the schedule's time zone list. */
	timeZones: string[]
	now: number
}

/** A change to a monitor, as PATCH /api/monitors/:id takes it. */
export interface MonitorPatch {
	paused?: boolean
	schedule?: Partial<MonitorSchedule>
	alerts?: Partial<AlertRules>
}
