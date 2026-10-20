import type { Monitor } from '@shared/monitors'
import type { MonitorPatch } from '@web/screens/monitors-screen'

export interface MonitorEditorProps {
	monitor: Monitor
	timeZones: string[]
	/** Saves a change straight away. Resolves to whether it was saved. */
	onChange(patch: MonitorPatch): Promise<boolean>
}
