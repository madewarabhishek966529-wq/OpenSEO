'use client'

import { memo, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { displayUrl } from '@shared/format'
import { describeSchedule, formatInZone } from '@shared/monitors'
import type { AuditProgress } from '@shared/types'
import { AuditProgressView } from '@web/components/audit-progress-view'
import { Button } from '@web/components/button'
import { GradeRing } from '@web/components/grade-ring'
import { Icon } from '@web/components/icon'
import { StatusMark } from '@web/components/status-mark'
import { TrendLine } from '@web/components/trend-line'
import { postForEvents } from '@web/lib/stream'
import type { MonitorPatch } from '@web/screens/monitors-screen'
import { LastRun } from './components/last-run'
import { MonitorEditor } from './components/monitor-editor'
import { RunList } from './components/run-list'
import type { MonitorCardProps } from './monitor-card.types'
import { trendOf } from './monitor-card.utils'

/** One monitored page: its latest result and trend, actions, and its settings and runs. */
const MonitorCard = (props: MonitorCardProps) => {
	const { monitor, timeZones, now } = props

	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [confirming, setConfirming] = useState(false)
	const [progress, setProgress] = useState<AuditProgress | null>(null)
	const [error, setError] = useState<string | null>(null)
	const { schedule, paused } = monitor
	const [last] = monitor.runs
	const trend = trendOf(monitor.runs)

	const save = useCallback(
		async (patch: MonitorPatch) => {
			setError(null)
			const res = await fetch(`/api/monitors/${monitor.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(patch)
			})
			if (!res.ok) {
				setError("Couldn't save the change. Try again.")

				return false
			}
			router.refresh()

			return true
		},
		[monitor.id, router]
	)

	const handleRunClick = async () => {
		setError(null)
		setProgress({ step: 'start', label: 'Starting the audit', pct: 1 })
		await postForEvents(`/api/monitors/${monitor.id}/run`, {}, (event) => {
			if (event.type === 'progress') setProgress(event)
			else {
				if (event.type === 'error') setError(event.message)
				setProgress(null)
				router.refresh()
			}
		})
	}

	const handleDeleteClick = async () => {
		await fetch(`/api/monitors/${monitor.id}`, { method: 'DELETE' })
		router.refresh()
	}

	return (
		<li className={`monitor-card${paused ? ' is-paused' : ''}`}>
			<div className="monitor-card-main">
				{last?.ok ? (
					<GradeRing score={last.score ?? 0} grade={last.grade ?? ''} size="md" />
				) : (
					<span className="monitor-card-badge" aria-hidden={!last}>
						{last ? (
							<StatusMark status="fail" size={34} />
						) : (
							<Icon name="clock" size={22} />
						)}
					</span>
				)}
				<div className="monitor-card-text">
					<a
						className="monitor-card-url mono"
						href={monitor.url}
						target="_blank"
						rel="noreferrer"
					>
						{displayUrl(monitor.url)}
					</a>
					<span className="muted">
						{describeSchedule(schedule)} · {schedule.timeZone.replace(/_/g, ' ')} ·{' '}
						{paused
							? 'Paused'
							: `Next run ${formatInZone(monitor.nextRunAt, schedule.timeZone)}`}
					</span>
					<LastRun runs={monitor.runs} now={now} />
				</div>
				{trend.length > 1 && (
					<div className="monitor-card-trend">
						<TrendLine points={trend} width={140} height={44} />
					</div>
				)}
				<div className="monitor-card-actions">
					<Button small onClick={handleRunClick} disabled={progress !== null}>
						<Icon name="refresh" size={14} />
						Run now
					</Button>
					<Button
						variant="icon"
						aria-label={paused ? 'Resume this monitor' : 'Pause this monitor'}
						title={paused ? 'Resume' : 'Pause'}
						onClick={() => save({ paused: !paused })}
					>
						<Icon name={paused ? 'play' : 'pause'} size={15} />
					</Button>
					<Button
						variant="icon"
						aria-label="Schedule, alerts and past runs"
						aria-expanded={open}
						title="Schedule, alerts and past runs"
						onClick={() => setOpen((value) => !value)}
					>
						<Icon name="settings" size={15} />
					</Button>
					{confirming ? (
						<span className="report-row-confirm">
							<Button small variant="quiet" onClick={() => setConfirming(false)}>
								Cancel
							</Button>
							<Button small variant="danger" onClick={handleDeleteClick}>
								Delete
							</Button>
						</span>
					) : (
						<Button
							variant="icon"
							aria-label="Delete this monitor"
							title="Delete"
							onClick={() => setConfirming(true)}
						>
							<Icon name="trash" size={15} />
						</Button>
					)}
				</div>
			</div>
			{progress && (
				<div className="monitor-card-progress">
					<AuditProgressView progress={progress} />
				</div>
			)}
			{error && (
				<p className="callout callout--error monitor-card-error" role="alert">
					<Icon name="alert" size={16} />
					{error}
				</p>
			)}
			{open && (
				<div className="monitor-card-details">
					<MonitorEditor
						key={JSON.stringify([schedule, monitor.alerts])}
						monitor={monitor}
						timeZones={timeZones}
						onChange={save}
					/>
					<RunList runs={monitor.runs} timeZone={schedule.timeZone} />
				</div>
			)}
		</li>
	)
}

export default memo(MonitorCard)
