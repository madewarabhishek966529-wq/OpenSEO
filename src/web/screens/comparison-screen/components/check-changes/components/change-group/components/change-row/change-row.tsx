import { memo } from 'react'
import { CATEGORY_BY_ID } from '@shared/grades'
import { CategoryTile } from '@web/components/category-tile'
import { Icon } from '@web/components/icon'
import { StatusMark } from '@web/components/status-mark'
import type { ChangeRowProps } from './change-row.types'
import { checkLink, summaryLines } from './change-row.utils'

/** A check's result in both audits, what each one found, and a link to the fix. */
const ChangeRow = (props: ChangeRowProps) => {
	const { check, comparison } = props

	return (
		<li className="change-row">
			<span className="change-row-marks">
				<span className="sr-only">{comparison.a.label}:</span>
				{check.a ? (
					<StatusMark status={check.a.status} size={20} />
				) : (
					<span className="change-row-missing">Not checked</span>
				)}
				<Icon name="arrowRight" size={12} className="change-row-arrow" />
				<span className="sr-only">{comparison.b.label}:</span>
				{check.b ? (
					<StatusMark status={check.b.status} size={20} />
				) : (
					<span className="change-row-missing">Not checked</span>
				)}
			</span>
			<span className="change-row-text">
				<a className="change-row-title" href={checkLink(check, comparison)}>
					{check.title}
				</a>
				{summaryLines(check, comparison).map((line) => (
					<span key={line.side ?? 'both'} className="change-row-summary">
						{line.side && <span className="change-row-side">{line.side}</span>}
						{line.text}
					</span>
				))}
			</span>
			<span className="change-row-category" title={CATEGORY_BY_ID[check.category].name}>
				<CategoryTile category={check.category} size={22} />
			</span>
		</li>
	)
}

export default memo(ChangeRow)
