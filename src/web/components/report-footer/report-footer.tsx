import { memo } from 'react'
import { Icon } from '@web/components/icon'
import { absoluteDate } from '@web/lib/time'
import type { ReportFooterProps } from './report-footer.types'

/** The call to action and the brand's footer line. */
const ReportFooter = (props: ReportFooterProps) => {
	const { brandName, footer, ctaText, ctaUrl, createdAt } = props

	return (
		<footer className="report-footer">
			{ctaText && ctaUrl && (
				<div className="report-cta">
					<div>
						<h2>Want these fixed?</h2>
						<p>{brandName} can take care of the issues in this report for you.</p>
					</div>
					<a
						className="button button--accent"
						href={ctaUrl}
						target="_blank"
						rel="noreferrer"
					>
						{ctaText}
						<Icon name="arrowRight" size={15} />
					</a>
				</div>
			)}
			<p className="report-footer-line muted">
				{footer || `Prepared by ${brandName}`} · Generated {absoluteDate(createdAt)} with
				OpenSEO
			</p>
		</footer>
	)
}

export default memo(ReportFooter)
