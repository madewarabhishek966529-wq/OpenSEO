import type { MonitorSchedule } from '@shared/monitors'

export interface ScheduleSelectProps {
	id?: string
	field: keyof MonitorSchedule
	schedule: MonitorSchedule
	/** Needed for the time zone field. */
	timeZones?: string[]
	disabled?: boolean
	onChange(patch: Partial<MonitorSchedule>): void
}
