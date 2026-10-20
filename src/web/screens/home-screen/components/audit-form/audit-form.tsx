'use client'

import { memo, useState, type SubmitEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AuditProgress } from '@shared/types'
import { AuditProgressView } from '@web/components/audit-progress-view'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import { postForEvents } from '@web/lib/stream'
import type { AuditFormProps } from './audit-form.types'

/** The address box. Runs the audit, shows progress, then opens the report. */
const AuditForm = (props: AuditFormProps) => {
	const { pagespeedEnabled } = props

	const router = useRouter()
	const [url, setUrl] = useState('')
	const [progress, setProgress] = useState<AuditProgress | null>(null)
	const [error, setError] = useState<string | null>(null)
	const running = progress !== null

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!url.trim() || running) return
		setError(null)
		setProgress({ step: 'start', label: 'Starting the audit', pct: 1 })
		await postForEvents('/api/audit', { url, source: 'web' }, (event) => {
			if (event.type === 'progress') setProgress(event)
			else if (event.type === 'done') router.push(`/report/${event.id}`)
			else {
				setError(event.message)
				setProgress(null)
			}
		})
	}

	return (
		<form className={`composer${running ? ' is-running' : ''}`} onSubmit={handleSubmit}>
			<label className="composer-field">
				<Icon name="globe" size={18} />
				<span className="sr-only">Website address</span>
				<input
					type="text"
					inputMode="url"
					autoComplete="url"
					spellCheck={false}
					placeholder="yourwebsite.com"
					value={url}
					disabled={running}
					onChange={(e) => setUrl(e.currentTarget.value)}
				/>
			</label>
			{progress ? (
				<AuditProgressView progress={progress} />
			) : (
				<div className="composer-footer">
					<span className={`chip${pagespeedEnabled ? ' chip--pass' : ''}`}>
						<span className="chip-dot" />
						{pagespeedEnabled ? 'Core Web Vitals on' : 'Core Web Vitals off'}
					</span>
					{!pagespeedEnabled && (
						<Link className="composer-hint" href="/settings">
							Turn on in Settings
						</Link>
					)}
					<span className="composer-hint composer-hint--end">Takes about 15 seconds</span>
					<Button type="submit" variant="primary" disabled={!url.trim()}>
						Audit site
						<Icon name="arrowRight" size={15} />
					</Button>
				</div>
			)}
			{error && (
				<p className="callout callout--error" role="alert">
					<Icon name="alert" size={16} />
					{error}
				</p>
			)}
		</form>
	)
}

export default memo(AuditForm)
