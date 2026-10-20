'use client'

import { memo, useMemo, useState } from 'react'
import { parseRobots, isAllowed } from '@server/audit/robots'

const SAMPLE_ROBOTS = `# Robots.txt sample
User-agent: *
Disallow: /admin/
Disallow: /checkout/
Disallow: /api/
Allow: /api/public/

# AI Crawlers
User-agent: GPTBot
Disallow: /internal/

User-agent: ClaudeBot
Allow: /

Sitemap: https://example.com/sitemap.xml
`

export const RobotsTester = memo(() => {
	const [content, setContent] = useState(SAMPLE_ROBOTS)
	const [testPath, setTestPath] = useState('/admin/dashboard')
	const [userAgent, setUserAgent] = useState('*')
	const [fetchUrl, setFetchUrl] = useState('')
	const [loading, setLoading] = useState(false)
	const [fetchError, setFetchError] = useState<string | null>(null)

	const parsed = useMemo(() => {
		try {
			return parseRobots(content)
		} catch {
			return null
		}
	}, [content])

	const evaluation = useMemo(() => {
		if (!parsed) return { allowed: true, reason: 'No valid robots rules found' }
		const path = testPath.startsWith('/') ? testPath : `/${testPath}`
		const allowed = isAllowed(parsed, userAgent, path)
		return {
			allowed,
			reason: allowed
				? `Path "${path}" is ALLOWED for User-Agent "${userAgent}".`
				: `Path "${path}" is DISALLOWED for User-Agent "${userAgent}".`
		}
	}, [parsed, testPath, userAgent])

	const handleFetch = async () => {
		if (!fetchUrl.trim()) return
		setLoading(true)
		setFetchError(null)
		try {
			let target = fetchUrl.trim()
			if (!target.startsWith('http://') && !target.startsWith('https://')) {
				target = `https://${target}`
			}
			const urlObj = new URL(target)
			const robotsUrl = `${urlObj.origin}/robots.txt`
			const res = await fetch(`/api/tools/inspect?url=${encodeURIComponent(robotsUrl)}`)
			const data = await res.json()
			if (data.status === 200) {
				const directRes = await fetch(robotsUrl)
				if (directRes.ok) {
					const text = await directRes.text()
					setContent(text)
				} else {
					setFetchError(`Could not fetch robots.txt directly (HTTP ${directRes.status}).`)
				}
			} else {
				setFetchError(data.error || 'Failed to fetch robots.txt')
			}
		} catch (err: unknown) {
			setFetchError(err instanceof Error ? err.message : 'Error fetching robots.txt')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="tool-grid">
			<div className="tool-inputs">
				<div className="tool-field-group">
					<label>
						<span>Fetch from Live Site</span>
					</label>
					<div style={{ display: 'flex', gap: '8px' }}>
						<input
							type="text"
							className="text-input"
							placeholder="example.com"
							value={fetchUrl}
							onChange={(e) => setFetchUrl(e.target.value)}
						/>
						<button
							type="button"
							className="btn btn--secondary"
							disabled={loading}
							onClick={handleFetch}
						>
							{loading ? 'Fetching...' : 'Fetch'}
						</button>
					</div>
					{fetchError && (
						<span style={{ fontSize: '12px', color: 'var(--fail)' }}>{fetchError}</span>
					)}
				</div>

				<div className="tool-field-group">
					<label>
						<span>Robots.txt Content</span>
						<span className="tool-char-count">{content.split('\n').length} lines</span>
					</label>
					<textarea
						className="text-input"
						rows={12}
						style={{ fontFamily: 'var(--font-data)', fontSize: '12.5px' }}
						value={content}
						onChange={(e) => setContent(e.target.value)}
					/>
				</div>
			</div>

			<div className="serp-preview-box">
				<span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
					Test Crawler Access
				</span>

				<div className="tool-field-group">
					<label>User-Agent to Test</label>
					<select
						className="select"
						value={userAgent}
						onChange={(e) => setUserAgent(e.target.value)}
					>
						<option value="*">Standard (* All crawlers)</option>
						<option value="Googlebot">Googlebot (Google Search)</option>
						<option value="Bingbot">Bingbot (Bing & Copilot)</option>
						<option value="GPTBot">GPTBot (OpenAI Training)</option>
						<option value="OAI-SearchBot">OAI-SearchBot (ChatGPT Search)</option>
						<option value="ClaudeBot">ClaudeBot (Anthropic)</option>
						<option value="PerplexityBot">PerplexityBot (Perplexity Search)</option>
						<option value="Applebot">Applebot (Apple Intelligence & Siri)</option>
					</select>
				</div>

				<div className="tool-field-group">
					<label>Test URL Path</label>
					<input
						type="text"
						className="text-input"
						value={testPath}
						onChange={(e) => setTestPath(e.target.value)}
						placeholder="/admin/page"
					/>
				</div>

				<div
					style={{
						padding: '16px',
						borderRadius: 'var(--radius-md)',
						background: evaluation.allowed ? 'var(--pass-soft)' : 'var(--fail-soft)',
						border: `1px solid ${evaluation.allowed ? 'var(--pass)' : 'var(--fail)'}`,
						display: 'flex',
						flexDirection: 'column',
						gap: '8px'
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span
							style={{
								fontWeight: 700,
								fontSize: '15px',
								color: evaluation.allowed ? 'var(--pass)' : 'var(--fail)'
							}}
						>
							{evaluation.allowed ? '✓ ALLOWED' : '✕ DISALLOWED'}
						</span>
					</div>
					<span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
						{evaluation.reason}
					</span>
				</div>

				<div
					style={{
						fontSize: '12px',
						color: 'var(--ink-3)',
						lineHeight: 1.5,
						marginTop: '8px'
					}}
				>
					ℹ️ <strong>Rule Precedence:</strong> When a path matches both an <code>Allow</code> and a{' '}
					<code>Disallow</code> rule, the longest (most specific) pattern wins according to RFC 9309.
				</div>
			</div>
		</div>
	)
})

RobotsTester.displayName = 'RobotsTester'
