import { memo, useState } from 'react'
import { StatusMark } from '@web/components/status-mark'
import { PLATFORM_KIND } from '@web/components/share-previews/share-previews.constants'
import { previewTone } from '@web/components/share-previews/share-previews.utils'
import { PreviewFrame } from './components/preview-frame'
import type { PreviewCardProps } from './preview-card.types'

/** One platform: a mock of its preview, then what's wrong with it. */
const PreviewCard = (props: PreviewCardProps) => {
	const { preview } = props

	const [telegramLayout, setTelegramLayout] = useState<'small' | 'large'>('large')

	const displayPreview =
	preview.platform === 'telegram' && preview.layout !== 'none'
		? { ...preview, layout: telegramLayout }
		: preview

	const headingId = `share-${preview.platform}`

	return (
		<article className="share-card" aria-labelledby={headingId}>
			<header className="share-card-head">
				<StatusMark status={previewTone(preview.notes)} size={20} />
				<h3 id={headingId}>{preview.name}</h3>
				<span className="muted">{PLATFORM_KIND[preview.platform]}</span>
			</header>
			<div className={`share-stage share-stage--${displayPreview.platform}`}>
				{preview.platform === 'telegram' && (
					<div className="telegram-layout-toggle" aria-label="Telegram preview layout">
						<button
							type="button"
							aria-pressed={telegramLayout === 'small'}
							onClick={() => setTelegramLayout('small')}
						>
							Small
						</button>
						<button
							type="button"
							aria-pressed={telegramLayout === 'large'}
							onClick={() => setTelegramLayout('large')}
						>
							Large
						</button>
					</div>
				)}
				<PreviewFrame preview={displayPreview} />
			</div>
			<ul className="share-notes">
				{preview.notes.map((note) => (
					<li key={note.text}>
						<StatusMark status={note.tone} size={16} />
						<span>{note.text}</span>
					</li>
				))}
			</ul>
		</article>
	)
}

export default memo(PreviewCard)
