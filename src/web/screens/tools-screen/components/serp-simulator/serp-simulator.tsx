'use client'

import { memo, useMemo, useState } from 'react'

export const SerpSimulator = memo(() => {
	const [title, setTitle] = useState('OpenSEO · Free Open Source Website SEO Audit & Crawler')
	const [url, setUrl] = useState('https://openseo.dev/features/site-audit')
	const [description, setDescription] = useState(
		'Audit your website for technical SEO, Core Web Vitals, broken links, mobile usability and AI search readiness. Export white-label reports with no paid APIs.'
	)
	const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
	const [showRating, setShowRating] = useState(true)
	const [showDate, setShowDate] = useState(true)

	// Pixel width approximations: ~9.5px per character in Arial 20px title, ~7px in 14px description
	const titlePx = useMemo(() => Math.round(title.length * 9.5), [title])
	const titleMaxPx = 600
	const titlePct = Math.min(100, Math.round((titlePx / titleMaxPx) * 100))

	const descMaxChars = 160
	const descPct = Math.min(100, Math.round((description.length / descMaxChars) * 100))

	const parsedUrl = useMemo(() => {
		try {
			const u = new URL(url)
			const domain = u.hostname.replace(/^www\./, '')
			const pathParts = u.pathname.split('/').filter(Boolean)
			const breadcrumb = pathParts.length > 0 ? ` › ${pathParts.join(' › ')}` : ''
			return { domain, breadcrumb, full: u.href }
		} catch {
			return { domain: 'example.com', breadcrumb: '', full: url }
		}
	}, [url])

	return (
		<div className="tool-grid">
			<div className="tool-inputs">
				<div className="tool-field-group">
					<label>
						<span>Page Title</span>
						<span
							className={`tool-char-count ${
								title.length >= 50 && title.length <= 60
									? 'is-good'
									: title.length > 60
										? 'is-warn'
										: ''
							}`}
						>
							{title.length} chars · ~{titlePx}px / 600px
						</span>
					</label>
					<input
						type="text"
						className="text-input"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Page Title"
					/>
					<div className="tool-meter">
						<div
							className={`tool-meter-fill ${
								title.length > 60 ? 'is-fail' : title.length >= 50 ? '' : 'is-warn'
							}`}
							style={{ width: `${titlePct}%` }}
						/>
					</div>
				</div>

				<div className="tool-field-group">
					<label>
						<span>Target URL</span>
					</label>
					<input
						type="text"
						className="text-input"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="https://example.com/page"
					/>
				</div>

				<div className="tool-field-group">
					<label>
						<span>Meta Description</span>
						<span
							className={`tool-char-count ${
								description.length >= 120 && description.length <= 160
									? 'is-good'
									: description.length > 160
										? 'is-warn'
										: ''
							}`}
						>
							{description.length} / 160 chars
						</span>
					</label>
					<textarea
						className="text-input"
						rows={3}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Meta description summary..."
					/>
					<div className="tool-meter">
						<div
							className={`tool-meter-fill ${
								description.length > 160
									? 'is-fail'
									: description.length >= 120
										? ''
										: 'is-warn'
							}`}
							style={{ width: `${descPct}%` }}
						/>
					</div>
				</div>

				<div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
						<input
							type="checkbox"
							checked={showRating}
							onChange={(e) => setShowRating(e.target.checked)}
						/>
						Include Star Rating (Rich Snippet)
					</label>
					<label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
						<input
							type="checkbox"
							checked={showDate}
							onChange={(e) => setShowDate(e.target.checked)}
						/>
						Include Publish Date
					</label>
				</div>
			</div>

			<div className="serp-preview-box">
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center'
					}}
				>
					<span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)' }}>
						Google SERP Live Preview
					</span>
					<div className="serp-device-toggle">
						<button
							type="button"
							className={`serp-device-btn ${device === 'desktop' ? 'is-active' : ''}`}
							onClick={() => setDevice('desktop')}
						>
							Desktop
						</button>
						<button
							type="button"
							className={`serp-device-btn ${device === 'mobile' ? 'is-active' : ''}`}
							onClick={() => setDevice('mobile')}
						>
							Mobile
						</button>
					</div>
				</div>

				<div className={`google-serp-card ${device === 'mobile' ? 'is-mobile' : ''}`}>
					<div className="google-url-row">
						<div className="google-favicon">G</div>
						<div className="google-breadcrumb">
							<span className="google-site-name">{parsedUrl.domain}</span>
							<span className="google-path">
								https://{parsedUrl.domain}
								{parsedUrl.breadcrumb}
							</span>
						</div>
					</div>

					<a className="google-title" onClick={(e) => e.preventDefault()}>
						{title || 'Untitled Document'}
					</a>

					{showRating && (
						<div className="google-rich-badge">
							<span>★★★★★</span>
							<span style={{ color: '#4d5156' }}>Rating: 4.9 · ‎128 reviews</span>
						</div>
					)}

					<div className="google-snippet">
						{showDate && <span style={{ color: '#70757a', marginRight: '6px' }}>Oct 20, 2026 —</span>}
						{description || 'No description provided. Search engines will generate their own snippet.'}
					</div>
				</div>

				<div
					style={{
						fontSize: '12px',
						color: 'var(--ink-3)',
						lineHeight: 1.5,
						marginTop: '4px'
					}}
				>
					💡 <strong>Pro Tip:</strong> Keep title tags under 60 characters and descriptions
					between 120–160 characters to ensure full visibility without truncation across both
					desktop and mobile search results.
				</div>
			</div>
		</div>
	)
})

SerpSimulator.displayName = 'SerpSimulator'
