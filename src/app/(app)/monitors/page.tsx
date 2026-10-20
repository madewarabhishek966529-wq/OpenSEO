import type { Metadata } from 'next'
import { alertTargets } from '@server/notify'
import { getSettings, listMonitors } from '@server/store'
import { MonitorsScreen } from '@web/screens/monitors-screen'

export const metadata: Metadata = { title: 'Monitors' }

const MonitorsPage = async () => {
	const [monitors, settings] = await Promise.all([listMonitors(), getSettings()])

	return (
		<MonitorsScreen
			monitors={monitors}
			targets={alertTargets(settings)}
			timeZones={['UTC', ...Intl.supportedValuesOf('timeZone')]}
			now={Date.now()}
		/>
	)
}

export default MonitorsPage
