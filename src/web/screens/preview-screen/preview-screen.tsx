'use client'

import { memo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@web/components/button'
import { EmptyState } from '@web/components/empty-state'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import { goodPreviews, SharePreviews } from '@web/components/share-previews'
import { PreviewForm } from './components/preview-form'
import type { PreviewScreenProps } from './preview-screen.types'

/** Check how any page looks when its link is shared, without running a full audit. */
const PreviewScreen = (props: PreviewScreenProps) => {
	const { initialUrl, result, error } = props

	const router = useRouter()
	const [pending, startTransition] = useTransition()

	const handleCheck = (url: string) =>
		startTransition(() => {
			if (url === initialUrl) router.refresh()
			else router.push(`/preview?url=${encodeURIComponent(url)}`)
		})

	const handleRecheck = () => handleCheck(initialUrl)

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Audit"
				title="Share preview"
				description="See how a link looks on Google, Facebook, X, LinkedIn, Slack, Discord, WhatsApp, Telegram and iMessage, and check its share image, favicon and app icons."
			/>
			<PreviewForm initialUrl={initialUrl} pending={pending} onCheck={handleCheck} />
			{error && !pending && (
				<p className="callout callout--error" role="alert">
					<Icon name="alert" size={16} />
					{error}
				</p>
			)}
			{result ? (
				<div className={`preview-result${pending ? ' is-stale' : ''}`} aria-busy={pending}>
					<div className="preview-result-head">
						<span className="preview-result-page">
							<strong>{result.title || 'Untitled page'}</strong>
							<a href={result.finalUrl} target="_blank" rel="noreferrer">
								{result.finalUrl}
							</a>
						</span>
						<span className="preview-result-score mono">
							{goodPreviews(result.sharing.previews)}/{result.sharing.previews.length}{' '}
							look good
						</span>
						<Button small disabled={pending} onClick={handleRecheck}>
							<Icon name="refresh" size={14} />
							Check again
						</Button>
					</div>
					<SharePreviews sharing={result.sharing} url={result.finalUrl} />
				</div>
			) : (
				!error && (
					<EmptyState icon="image" title="Paste a link to preview it">
						<p>
							Works on any public page: your home page, a blog post or a product. It
							only takes a few seconds.
						</p>
					</EmptyState>
				)
			)}
		</div>
	)
}

export default memo(PreviewScreen)
