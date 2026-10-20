import { memo } from 'react'
import { SharePreviews } from '@web/components/share-previews'
import type { ShareSectionProps } from './share-section.types'

/** How a link to the audited page looks on Google, social networks and in chat apps. */
const ShareSection = (props: ShareSectionProps) => {
	const { sharing, url } = props

	return (
		<section className="report-card" id="sharing" aria-labelledby="sharing-title">
			<div className="report-card-head">
				<h2 id="sharing-title">How your link looks when shared</h2>
				<span className="muted">{sharing.previews.length} platforms</span>
			</div>
			<SharePreviews sharing={sharing} url={url} />
		</section>
	)
}

export default memo(ShareSection)
