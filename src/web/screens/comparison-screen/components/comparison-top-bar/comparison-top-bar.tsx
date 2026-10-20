'use client'

import { memo, useState } from 'react'
import { BrandMark } from '@web/components/brand-mark'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import type { ComparisonTopBarProps } from './comparison-top-bar.types'
import { subject } from './comparison-top-bar.utils'

/** The floating bar over a comparison: brand, what's compared and the comparison's actions. */
const ComparisonTopBar = (props: ComparisonTopBarProps) => {
	const { comparison, brandName, brandLogo, linkToWorkspace } = props

	const { a, b, samePage } = comparison
	const [copied, setCopied] = useState(false)

	const handleCopyClick = async () => {
		await navigator.clipboard.writeText(window.location.href)
		setCopied(true)
		setTimeout(() => setCopied(false), 1800)
	}

	return (
		<header className="report-top-bar">
			<a className="report-top-bar-brand" href="/" aria-label={`${brandName} home`}>
				<BrandMark name={brandName} logo={brandLogo} />
			</a>
			<span className="report-top-bar-site mono">{subject(comparison)}</span>
			<div className="report-top-bar-actions">
				<Button small variant="quiet" title="Copy link" onClick={handleCopyClick}>
					<Icon name={copied ? 'check' : 'link'} size={15} />
					<span className="top-bar-label">{copied ? 'Copied' : 'Copy link'}</span>
				</Button>
				{!samePage && (
					<a
						className="button button--quiet button--small"
						href={`/report/${b.id}/compare/${a.id}`}
						title="Swap the two pages"
					>
						<Icon name="swap" size={15} />
						<span className="top-bar-label">Swap</span>
					</a>
				)}
				{linkToWorkspace && (
					<a
						className="button button--quiet button--small"
						href={`/compare?a=${a.id}&b=${b.id}`}
						title="Compare other audits"
					>
						<Icon name="compare" size={15} />
						<span className="top-bar-label">Change</span>
					</a>
				)}
				<Button small variant="primary" title="Save as PDF" onClick={() => window.print()}>
					<Icon name="printer" size={15} />
					Save PDF
				</Button>
			</div>
		</header>
	)
}

export default memo(ComparisonTopBar)
