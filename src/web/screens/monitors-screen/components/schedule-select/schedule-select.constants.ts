import type { MonitorSchedule } from '@shared/monitors'

export const FIELD_LABELS: Record<keyof MonitorSchedule, string> = {
	frequency: 'How often',
	weekday: 'Day of the week',
	hour: 'Time of day',
	timeZone: 'Time zone'
}
