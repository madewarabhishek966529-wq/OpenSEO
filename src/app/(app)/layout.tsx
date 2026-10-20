import { getSettings } from '@server/store'
import { AppShell } from '@web/components/app-shell'

const AppLayout = async (props: LayoutProps<'/'>) => {
	const { children } = props

	const settings = await getSettings()

	return (
		<AppShell brandName={settings.brandName} brandLogo={settings.brandLogo || undefined}>
			{children}
		</AppShell>
	)
}

export default AppLayout
