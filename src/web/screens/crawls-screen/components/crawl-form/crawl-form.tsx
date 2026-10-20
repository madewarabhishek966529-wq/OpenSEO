'use client'

import { memo, useState, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { AuditProgress } from '@shared/types'
import { AuditProgressView } from '@web/components/audit-progress-view'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import { postForEvents } from '@web/lib/stream'
import type { CrawlFormProps } from './crawl-form.types'
import { pageOptions } from './crawl-form.utils'

const CrawlForm = (props: CrawlFormProps) => {
	const { pageLimit } = props

	const router = useRouter()
	const options = pageOptions(pageLimit)
	const [url, setUrl] = useState('')
	const [maxPages, setMaxPages] = useState(options[Math.min(1, options.length - 1)].value)
	const [mode, setMode] = useState<'links' | 'sitemap'>('links')
	const [progress, setProgress] = useState<AuditProgress | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!url.trim() || progress) return
		setError(null)
		setProgress({ step: 'start', label: 'Starting the crawl', pct: 1 })
		await postForEvents('/api/crawl', { url, maxPages, mode }, (event) => {
			if (event.type === 'progress') setProgress(event)
			else if (event.type === 'done') router.push(`/crawls/${event.id}`)
			else {
				setError(event.message)
				setProgress(null)
			}
		})
	}

	return (
		<form className="panel-form" onSubmit={handleSubmit}>
			<div className="panel-form-row">
				<label className="composer-field panel-form-url">
					<Icon name="globe" size={18} />
					<span className="sr-only">Website to crawl</span>
					<input
						type="text"
						inputMode="url"
						spellCheck={false}
						placeholder="yourwebsite.com"
						value={url}
						disabled={progress !== null}
						onChange={(e) => setUrl(e.currentTarget.value)}
					/>
				</label>
				<select
					className="select panel-form-select"
					aria-label="Crawl method"
					value={mode}
					disabled={progress !== null}
					onChange={(e) => setMode(e.currentTarget.value as 'links' | 'sitemap')}
					style={{ maxWidth: '160px' }}
				>
					<option value="links">Follow links</option>
					<option value="sitemap">XML sitemap</option>
				</select>
				<select
					className="select panel-form-select"
					aria-label="Pages to crawl"
					value={maxPages}
					disabled={progress !== null}
					onChange={(e) => setMaxPages(Number(e.currentTarget.value))}
				>
					{options.map((o) => (
						<option key={o.value} value={o.value}>
							Up to {o.label}
						</option>
					))}
				</select>
				<Button type="submit" variant="primary" disabled={!url.trim() || progress !== null}>
					Crawl site
				</Button>
			</div>
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

export default memo(CrawlForm)
