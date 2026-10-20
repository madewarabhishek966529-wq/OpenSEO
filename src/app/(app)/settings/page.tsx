import type { Metadata } from 'next'
import { getPublicSettings } from '@server/settings'
import { SettingsScreen } from '@web/screens/settings-screen'

export const metadata: Metadata = { title: 'Settings' }

const SettingsPage = async () => {
	const settings = await getPublicSettings()

	return <SettingsScreen settings={settings} version={process.env.OPENSEO_VERSION ?? ''} />
}

export default SettingsPage
