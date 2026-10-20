import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { getSettings } from '@server/store'
import { readableTextOn } from '@shared/settings'
// Fonts are bundled with the app (OFL licensed), so builds and visitors never call Google Fonts.
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@web/styles/base.css'
import '@web/styles/shell.css'
import '@web/styles/home.css'
import '@web/styles/report.css'
import '@web/styles/screens.css'
import '@web/styles/share.css'
import '@web/styles/compare.css'
import '@web/styles/monitors.css'
import '@web/styles/print.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
	const settings = await getSettings()

	return {
		title: {
			default: `${settings.brandName} · SEO audit`,
			template: `%s · ${settings.brandName}`
		},
		description:
			'Audit any page for on-page SEO, speed, links, mobile, security and AI search readiness.'
	}
}

const RootLayout = async (props: LayoutProps<'/'>) => {
	const { children } = props

	const settings = await getSettings()
	const brand = {
		'--accent': settings.brandColor,
		'--on-accent': readableTextOn(settings.brandColor)
	} as CSSProperties

	return (
		<html lang="en" data-theme={settings.theme}>
			<body style={brand}>{children}</body>
		</html>
	)
}

export default RootLayout
