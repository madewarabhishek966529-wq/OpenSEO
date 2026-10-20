import { getSettings, listReports } from '@server/store'
import { HomeScreen } from '@web/screens/home-screen'

const HomePage = async () => {
	const [reports, settings] = await Promise.all([listReports(), getSettings()])

	return (
		<HomeScreen
			recent={reports.slice(0, 6)}
			now={Date.now()}
			pagespeedEnabled={settings.pagespeedEnabled}
		/>
	)
}

export default HomePage
