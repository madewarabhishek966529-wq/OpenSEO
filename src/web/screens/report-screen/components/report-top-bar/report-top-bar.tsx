'use client'

import { memo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { displayUrl } from '@shared/format'
import { BrandMark } from '@web/components/brand-mark'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import { postForEvents } from '@web/lib/stream'
import type { ReportTopBarProps } from './report-top-bar.types'

/** The floating bar over a report: brand, the audited site and the report's actions. */
const ReportTopBar = (props: ReportTopBarProps) => {
	const { report, brandName, brandLogo, linkToWorkspace } = props

	const router = useRouter()
	const [copied, setCopied] = useState(false)
	const [rerunning, setRerunning] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleCopyClick = async () => {
		await navigator.clipboard.writeText(window.location.href)
		setCopied(true)
		setTimeout(() => setCopied(false), 1800)
	}

	const handleRerunClick = async () => {
		setError(null)
		setRerunning('Starting')
		await postForEvents('/api/audit', { url: report.finalUrl, source: 'web' }, (event) => {
			if (event.type === 'progress') setRerunning(`${event.pct}%`)
			else if (event.type === 'done') router.push(`/report/${event.id}`)
			else {
				setRerunning(null)
				setError(event.message)
			}
		})
	}

	return (
		<header className="report-top-bar">
			<a className="report-top-bar-brand" href="/" aria-label={`${brandName} home`}>
				<BrandMark name={brandName} logo={brandLogo} />
			</a>
			<span className="report-top-bar-site mono">{displayUrl(report.finalUrl)}</span>
			<div className="report-top-bar-actions">
				{error && (
					<span className="report-top-bar-error" role="alert">
						{error}
					</span>
				)}
				<Button small variant="quiet" title="Copy link" onClick={handleCopyClick}>
					<Icon name={copied ? 'check' : 'link'} size={15} />
					<span className="top-bar-label">{copied ? 'Copied' : 'Copy link'}</span>
				</Button>
				{linkToWorkspace && (
					<a
						className="button button--quiet button--small"
						href={`/compare?a=${report.id}`}
						title="Compare with another audit"
					>
						<Icon name="compare" size={15} />
						<span className="top-bar-label">Compare</span>
					</a>
				)}
				<a
					className="button button--quiet button--small"
					href={`/api/reports/${report.id}`}
					title="Download as JSON"
					download
				>
					<Icon name="download" size={15} />
					<span className="top-bar-label">JSON</span>
				</a>
				<Button
					small
					variant="quiet"
					title="Run the audit again"
					onClick={handleRerunClick}
					disabled={rerunning !== null}
				>
					<Icon name="refresh" size={15} />
					<span className="top-bar-label">{rerunning ?? 'Run again'}</span>
				</Button>
				<Button small variant="primary" title="Save as PDF" onClick={() => window.print()}>
					<Icon name="printer" size={15} />
					Save PDF
				</Button>
			</div>
		</header>
	)
}

export default memo(ReportTopBar)
