import {
	FREQUENCY_OPTIONS,
	HOUR_OPTIONS,
	WEEKDAY_OPTIONS,
	type MonitorSchedule
} from '@shared/monitors'

export function optionsFor(
	field: keyof MonitorSchedule,
	schedule: MonitorSchedule,
	timeZones: string[]
): { value: string | number; label: string }[] {
	if (field === 'frequency') return FREQUENCY_OPTIONS
	if (field === 'weekday') return WEEKDAY_OPTIONS
	if (field === 'hour') return HOUR_OPTIONS
	const zones = timeZones.includes(schedule.timeZone)
		? timeZones
		: [schedule.timeZone, ...timeZones]

	return zones.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))
}

/** The select's value as the schedule stores it: numbers for the hour and day. */
export function parseValue(field: keyof MonitorSchedule, value: string): string | number {
	return field === 'hour' || field === 'weekday' ? Number(value) : value
}
