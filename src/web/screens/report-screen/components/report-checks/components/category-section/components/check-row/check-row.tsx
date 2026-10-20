'use client'

import { memo, useState } from 'react'
import { PRIORITY_LABEL } from '@shared/grades'
import { Icon } from '@web/components/icon'
import { StatusMark } from '@web/components/status-mark'
import { DetailBlock } from './components/detail-block'
import type { CheckRowProps } from './check-row.types'

/** One check. Problems start open; the rest open on click. Print shows everything. */
const CheckRow = (props: CheckRowProps) => {
	const { check } = props

	const hasBody = Boolean(check.recommendation || check.details?.length)
	const [open, setOpen] = useState(check.status === 'fail')
	const bodyId = `check-${check.id}-body`

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
					{check.details?.map((detail, index) => (
						<DetailBlock key={index} detail={detail} />
					))}
				</div>
			)}
		</li>
	)
}

export default memo(CheckRow)
