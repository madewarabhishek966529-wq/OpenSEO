'use client'

import { memo, useEffect, useState, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_SCHEDULE, type Monitor, type MonitorSchedule } from '@shared/monitors'
import type { AuditProgress } from '@shared/types'
import { AuditProgressView } from '@web/components/audit-progress-view'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import { postForEvents } from '@web/lib/stream'
import { ScheduleSelect } from '@web/screens/monitors-screen/components/schedule-select'

/** Adds a monitor, then runs its first audit so the next run has something to compare with. */
const MonitorForm = () => {
	const router = useRouter()
	const [url, setUrl] = useState('')
	const [schedule, setSchedule] = useState<MonitorSchedule>(DEFAULT_SCHEDULE)
	const [progress, setProgress] = useState<AuditProgress | null>(null)
	const [error, setError] = useState<string | null>(null)
	const busy = progress !== null

	useEffect(() => {
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
		if (timeZone) setSchedule((current) => ({ ...current, timeZone }))
	}, [])

	const handleScheduleChange = (patch: Partial<MonitorSchedule>) => {
		setSchedule((current) => ({ ...current, ...patch }))
	}

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!url.trim() || busy) return
		setError(null)
		setProgress({ step: 'start', label: 'Adding the monitor', pct: 1 })
		const res = await fetch('/api/monitors', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ url, schedule })
		})
		const data = (await res.json().catch(() => ({}))) as Partial<Monitor> & { error?: string }
		if (!res.ok || !data.id) {
			setError(data.error ?? `Couldn't add the monitor (${res.status}).`)
			setProgress(null)

			return
		}
		setUrl('')
		router.refresh()
		await postForEvents(`/api/monitors/${data.id}/run`, {}, (event) => {
			if (event.type === 'progress')
				setProgress({ ...event, label: `First audit: ${event.label}` })
			else {
				setProgress(null)
				router.refresh()
			}
		})
	}

	return (
		<form className="panel-form" onSubmit={handleSubmit}>
			<div className="panel-form-row">
				<label className="composer-field panel-form-url">
					<Icon name="globe" size={18} />
					<span className="sr-only">Page to monitor</span>
					<input
						type="text"
						inputMode="url"
						spellCheck={false}
						placeholder="yourwebsite.com/pricing"
						value={url}
						disabled={busy}
						onChange={(e) => setUrl(e.currentTarget.value)}
					/>
				</label>
				<ScheduleSelect
					field="frequency"
					schedule={schedule}
					disabled={busy}
					onChange={handleScheduleChange}
				/>
				{schedule.frequency === 'weekly' && (
					<ScheduleSelect
						field="weekday"
						schedule={schedule}
						disabled={busy}
						onChange={handleScheduleChange}
					/>
				)}
				<ScheduleSelect
					field="hour"
					schedule={schedule}
					disabled={busy}
					onChange={handleScheduleChange}
				/>
				<Button type="submit" variant="primary" disabled={!url.trim() || busy}>
					Add monitor
				</Button>
			</div>
			<p className="panel-form-note muted">
				Times are in {schedule.timeZone.replace(/_/g, ' ')}. New monitors alert when the
				score drops 5 points or more, the page stops loading, or its SSL certificate has 14
				days left. Change that for each monitor below.
			</p>
			{progress && <AuditProgressView progress={progress} />}
			{error && (
				<p className="callout callout--error" role="alert">
					<Icon name="alert" size={16} />
					{error}
				</p>
			)}
		</form>
	)
}

export default memo(MonitorForm)
