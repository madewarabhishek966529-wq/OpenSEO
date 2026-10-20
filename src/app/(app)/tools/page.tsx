import type { Metadata } from 'next'
import { ToolsScreen } from '@web/screens/tools-screen'

export const metadata: Metadata = {
	title: 'SEO Utilities'
}

const ToolsPage = () => {
	return <ToolsScreen />
}

export default ToolsPage
