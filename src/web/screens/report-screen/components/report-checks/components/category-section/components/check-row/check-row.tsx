'use client'

import { memo, useState } from 'react'
import { PRIORITY_LABEL } from '@shared/grades'
import { Icon } from '@web/components/icon'
import { StatusMark } from '@web/components/status-mark'
import { DetailBlock } from './components/detail-block'
import type { AiFixData, CheckRowProps } from './check-row.types'

/** One check. Problems start open; the rest open on click. Print shows everything. */
const CheckRow = (props: CheckRowProps) => {
	const { check } = props

	const hasBody = Boolean(check.recommendation || check.details?.length)
	const [open, setOpen] = useState(check.status === 'fail')
	const [aiLoading, setAiLoading] = useState(false)
	const [aiFix, setAiFix] = useState<AiFixData | null>(null)
	const [copied, setCopied] = useState(false)
	const bodyId = `check-${check.id}-body`

	const handleAiFix = async (e: React.MouseEvent) => {
		e.stopPropagation()
		if (aiFix) {
			setAiFix(null)
			return
		}
		setAiLoading(true)
		try {
			const res = await fetch('/api/ai/suggest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					checkId: check.id,
					checkTitle: check.title,
					summary: check.summary,
					recommendation: check.recommendation
				})
			})
			if (res.ok) {
				const data = (await res.json()) as AiFixData
				setAiFix(data)
			}
		} catch {
			// ignore error
		} finally {
			setAiLoading(false)
		}
	}

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<li
			className={`check-row is-${check.status}${open ? ' is-open' : ''}`}
			id={`check-${check.id}`}
		>
			<button
				type="button"
				className="check-row-head"
				aria-expanded={hasBody ? open : undefined}
				aria-controls={hasBody ? bodyId : undefined}
				disabled={!hasBody}
				onClick={() => setOpen((value) => !value)}
			>
				<StatusMark status={check.status} />
				<span className="check-row-text">
					<span className="check-row-title">{check.title}</span>
					<span className="check-row-summary">{check.summary}</span>
				</span>
				{check.status !== 'pass' && check.status !== 'info' && (
					<span className={`chip priority-chip priority-chip--${check.priority}`}>
						{PRIORITY_LABEL[check.priority]}
					</span>
				)}
				{hasBody && <Icon name="chevronDown" size={16} className="check-row-chevron" />}
			</button>
			{hasBody && (
				<div className="check-row-body" id={bodyId}>
					{check.recommendation && (
						<p className="check-row-fix">
							<span className="section-label">How to fix</span>
							{check.recommendation}
						</p>
					)}

					{check.status !== 'pass' && (
						<div>
							<button
								type="button"
								className="ai-fix-btn"
								disabled={aiLoading}
								onClick={handleAiFix}
							>
								<Icon name="sparkles" size={14} />
								<span>
									{aiLoading
										? 'Generating AI Fix...'
										: aiFix
											? 'Hide AI Fix'
											: '✨ AI Fix Suggestion'}
								</span>
							</button>

							{aiFix && (
								<div className="ai-fix-box">
									<div className="ai-fix-head">
										<span>AI Recommended Solution</span>
										{aiFix.code && (
											<button
												type="button"
												className="btn btn--secondary"
												style={{ padding: '2px 8px', fontSize: '11px' }}
												onClick={() => handleCopy(aiFix.code!)}
											>
												{copied ? '✓ Copied!' : 'Copy Code'}
											</button>
										)}
									</div>
									{aiFix.code ? (
										<div className="ai-fix-content">{aiFix.code}</div>
									) : (
										<div className="ai-fix-content">{aiFix.text}</div>
									)}
									<div className="ai-fix-explanation">{aiFix.explanation}</div>
								</div>
							)}
						</div>
					)}

					{check.details?.map((detail, index) => (
						<DetailBlock key={index} detail={detail} />
					))}
				</div>
			)}
		</li>
	)
}

export default memo(CheckRow)
