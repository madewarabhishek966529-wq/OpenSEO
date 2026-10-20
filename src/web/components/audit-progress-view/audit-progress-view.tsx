import { memo } from 'react'
import type { AuditProgressViewProps } from './audit-progress-view.types'

/** What the audit or crawl is doing right now, with a progress bar. */
const AuditProgressView = (props: AuditProgressViewProps) => {
	const { progress } = props

	return (
		<div className="audit-progress" role="status" aria-live="polite">
			<div className="audit-progress-row">
				<span className="audit-progress-pulse" aria-hidden="true" />
				<span className="audit-progress-label">{progress.label}</span>
				<span className="audit-progress-pct mono">{progress.pct}%</span>
			</div>
			<span className="audit-progress-track" aria-hidden="true">
				<span className="audit-progress-fill" style={{ width: `${progress.pct}%` }} />
			</span>
		</div>
	)
}

export default memo(AuditProgressView)
