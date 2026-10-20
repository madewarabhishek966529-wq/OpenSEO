import type { SharePreviewResult } from '@shared/types'

export interface PreviewScreenProps {
	/** The address in the page's ?url=, already checked when there's a result or error. */
	initialUrl: string
	result?: SharePreviewResult
	error?: string
}
