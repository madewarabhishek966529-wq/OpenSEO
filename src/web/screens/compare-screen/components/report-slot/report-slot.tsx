'use client'

import { memo, useEffect, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { displayUrl } from '@shared/format'
import type { AuditProgress } from '@shared/types'
import { AuditProgressView } from '@web/components/audit-progress-view'
import { Button } from '@web/components/button'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { Input } from '@web/components/input'
import { postForEvents } from '@web/lib/stream'
import { relativeTime } from '@web/lib/time'
import type { FreshAudit } from '@web/screens/compare-screen'
import type { ReportSlotProps } from './report-slot.types'
import { bySite, optionLabel, pickedAudit } from './report-slot.utils'

/** One side of the comparison: an audit picked from history, or a page audited right here. */
const ReportSlot = (props: ReportSlotProps) => {
	const { label, placeholder, reports, value, other, now, onChange } = props

	const router = useRouter()
	const [url, setUrl] = useState('')
	const [progress, setProgress] = useState<AuditProgress | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [fresh, setFresh] = useState<FreshAudit | null>(null)
	// The list shows local times, which only the browser knows, so it's filled in after loading.
	const [mounted, setMounted] = useState(false)
	const picked = pickedAudit(value, reports, fresh)
	const running = progress !== null

	useEffect(() => {
		setMounted(true)
	}, [])

	const handleAuditClick = async () => {
		if (!url.trim() || running) return
		setError(null)
		setProgress({ step: 'start', label: 'Starting the audit', pct: 1 })
		await postForEvents('/api/audit', { url, source: 'web' }, (event) => {
			if (event.type === 'progress') setProgress(event)
			else if (event.type === 'done') {
				setFresh({ id: event.id, url, score: event.score, grade: event.grade })
				setProgress(null)
				setUrl('')
				onChange(event.id)
				router.refresh()
			} else {
				setError(event.message)
				setProgress(null)
			}
		})
	}

	const handleUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== 'Enter') return
		e.preventDefault()
		handleAuditClick()
	}

	if (picked) {
		return (
			<div className="compare-slot">
				<span className="section-label">{label}</span>
				<div className="compare-slot-card">
					<GradeRing score={picked.score} grade={picked.grade} size="sm" />
					<span className="compare-slot-text">
						<strong className="mono">{displayUrl(picked.url)}</strong>
						<span className="muted">
							{picked.createdAt ? relativeTime(picked.createdAt, now) : 'Just now'} ·{' '}
							{picked.score}/100
						</span>
					</span>
					<Button small variant="quiet" onClick={() => onChange(null)}>
						Change
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="compare-slot">
			<span className="section-label">{label}</span>
			<select
				className="select"
				aria-label={`${label} from history`}
				value=""
				disabled={running || !reports.length}
				onChange={(e) => onChange(e.currentTarget.value || null)}
			>
				<option value="">
					{reports.length ? 'Pick an audit from history' : 'No audits yet'}
				</option>
				{(mounted ? bySite(reports) : []).map((site) => (
					<optgroup key={site.domain} label={site.domain}>
						{site.reports.map((report) => (
							<option
								key={report.id}
								value={report.id}
								disabled={report.id === other}
							>
								{optionLabel(report)}
							</option>
						))}
					</optgroup>
				))}
			</select>
			<span className="compare-slot-or muted">or audit a page now</span>
			<div className="compare-slot-audit">
				<Input
					type="text"
					inputMode="url"
					spellCheck={false}
					aria-label={`${label}: page to audit`}
					placeholder={placeholder}
					value={url}
					disabled={running}
					onChange={(e) => setUrl(e.currentTarget.value)}
					onKeyDown={handleUrlKeyDown}
				/>
				<Button disabled={!url.trim() || running} onClick={handleAuditClick}>
					Audit
				</Button>
			</div>
			{progress && <AuditProgressView progress={progress} />}
			{error && (
				<p className="callout callout--error" role="alert">
					<Icon name="alert" size={16} />
					{error}
				</p>
			)}
		</div>
	)
}

export default memo(ReportSlot)
