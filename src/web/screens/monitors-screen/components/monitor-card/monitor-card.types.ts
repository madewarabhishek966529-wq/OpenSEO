import type { Monitor } from '@shared/monitors'

export interface MonitorCardProps {
	monitor: Monitor
	timeZones: string[]
	now: number
}
