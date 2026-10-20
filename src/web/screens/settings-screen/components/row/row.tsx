import { memo } from 'react'
import type { RowProps } from './row.types'

const Row = (props: RowProps) => {
	const { label, note, htmlFor, children } = props

	return (
		<div className="settings-row">
			<div className="settings-row-text">
				{htmlFor ? (
					<label className="settings-row-label" htmlFor={htmlFor}>
						{label}
					</label>
				) : (
					<span className="settings-row-label">{label}</span>
				)}
				{note && <p className="settings-row-note">{note}</p>}
			</div>
			<div className="settings-row-control">{children}</div>
		</div>
	)
}

export default memo(Row)
