'use client'

import { memo, useState } from 'react'
import type { InspectResult } from './header-inspector.types'

export const HeaderInspector = memo(() => {
	const [url, setUrl] = useState('https://google.com')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [data, setData] = useState<InspectResult | null>(null)

	const handleInspect = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!url.trim()) return
		setLoading(true)
		setError(null)
		try {
			const res = await fetch(`/api/tools/inspect?url=${encodeURIComponent(url.trim())}`)
			const result = await res.json()
			if (!res.ok) {
				setError(result.error || 'Failed to inspect URL')
			} else {
				setData(result)
			}
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Error inspecting URL')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
			<form onSubmit={handleInspect} style={{ display: 'flex', gap: '10px' }}>
				<input
					type="text"
					className="text-input"
					style={{ flex: 1 }}
					placeholder="https://example.com"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
				/>
				<button type="submit" className="btn btn--primary" disabled={loading}>
					{loading ? 'Inspecting...' : 'Inspect Headers'}
				</button>
			</form>

			{error && (
				<div
					style={{
						padding: '12px 16px',
						borderRadius: 'var(--radius-md)',
						background: 'var(--fail-soft)',
						color: 'var(--fail)',
						fontSize: '13px'
					}}
				>
					{error}
				</div>
			)}

			{data && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
					{/* Summary Grid */}
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
							gap: '12px'
						}}
					>
						<div
							style={{
								background: 'var(--surface-2)',
								padding: '14px',
								borderRadius: 'var(--radius-md)',
								border: '1px solid var(--line)'
							}}
						>
							<div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>HTTP Status</div>
							<div
								style={{
									fontSize: '18px',
									fontWeight: 700,
									color: data.status === 200 ? 'var(--pass)' : 'var(--warn)'
								}}
							>
								{data.status} {data.statusText}
							</div>
						</div>

						<div
							style={{
								background: 'var(--surface-2)',
								padding: '14px',
								borderRadius: 'var(--radius-md)',
								border: '1px solid var(--line)'
							}}
						>
							<div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Security Headers</div>
							<div
								style={{
									fontSize: '18px',
									fontWeight: 700,
									color: data.securityScore >= 4 ? 'var(--pass)' : 'var(--warn)'
								}}
							>
								{data.securityScore} of 9 active
							</div>
						</div>

						<div
							style={{
								background: 'var(--surface-2)',
								padding: '14px',
								borderRadius: 'var(--radius-md)',
								border: '1px solid var(--line)'
							}}
						>
							<div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Response TTFB</div>
							<div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
								{data.ttfbMs} ms
							</div>
						</div>

						<div
							style={{
								background: 'var(--surface-2)',
								padding: '14px',
								borderRadius: 'var(--radius-md)',
								border: '1px solid var(--line)'
							}}
						>
							<div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Security Protocol</div>
							<div
								style={{
									fontSize: '18px',
									fontWeight: 700,
									color: data.isHttps ? 'var(--pass)' : 'var(--fail)'
								}}
							>
								{data.protocol}
							</div>
						</div>
					</div>

					{/* Redirect Chain */}
					{data.redirectHops && data.redirectHops.length > 0 && (
						<div
							style={{
								padding: '12px 16px',
								background: 'var(--surface-2)',
								border: '1px solid var(--line)',
								borderRadius: 'var(--radius-md)',
								fontSize: '13px'
							}}
						>
							<span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Redirect Chain: </span>
							{data.redirectHops.map((hop, idx) => (
								<span key={idx}>
									<code style={{ fontFamily: 'var(--font-data)' }}>{hop.url}</code> (
									{hop.status}) ➔{' '}
								</span>
							))}
							<code style={{ fontFamily: 'var(--font-data)', color: 'var(--pass)' }}>
								{data.finalUrl}
							</code>
						</div>
					)}

					{/* Headers Table */}
					<div
						style={{
							background: 'var(--surface)',
							border: '1px solid var(--line)',
							borderRadius: 'var(--radius-lg)',
							overflow: 'hidden'
						}}
					>
						<table className="inspect-header-table">
							<thead>
								<tr>
									<th style={{ width: '35%' }}>Header Name</th>
									<th>Value</th>
								</tr>
							</thead>
							<tbody>
								{data.headers.map((h, i) => (
									<tr key={i}>
										<td className="inspect-header-name">
											{h.name}
											{h.isSecurity && <span className="security-tag">Security</span>}
										</td>
										<td className="inspect-header-val">{h.value}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
})

HeaderInspector.displayName = 'HeaderInspector'
