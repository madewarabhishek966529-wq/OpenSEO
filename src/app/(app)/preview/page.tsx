import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { ipFromHeaders } from '@server/limits'
import { previewForVisitor } from '@server/share-preview'
import { PreviewScreen } from '@web/screens/preview-screen'

export const metadata: Metadata = { title: 'Share preview' }

const PreviewPage = async (props: PageProps<'/preview'>) => {
	const { url } = await props.searchParams
	const input = typeof url === 'string' ? url.trim() : ''
	if (!input) return <PreviewScreen initialUrl="" />
	const outcome = await previewForVisitor(input, ipFromHeaders(await headers()))

	return (
		<PreviewScreen
			initialUrl={input}
			result={'result' in outcome ? outcome.result : undefined}
			error={'error' in outcome ? outcome.error : undefined}
		/>
	)
}

export default PreviewPage
