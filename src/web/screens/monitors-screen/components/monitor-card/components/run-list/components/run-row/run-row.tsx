import { memo } from 'react'
import Link from 'next/link'
import { formatInZone } from '@shared/monitors'
import { Delta } from '@web/components/delta'
import { StatusMark } from '@web/components/status-mark'
import type { RunRowProps } from './run-row.types'
import { deliveryNote, sentenceCase } from './run-row.utils'

const RunRow = (props: RunRowProps) => {
	const { run, previous, timeZone } = props

	const note = run.alerts.length ? deliveryNote(run) : null

	return (
		<tr>
			<td className="run-row-time mono">{formatInZone(run.at, timeZone)}</td>
			<td>
				{run.ok ? (
					<span className="run-row-result">
						<Link className="mono" href={`/report/${run.reportId}`}>
							{run.grade} {run.score}
						</Link>
						{previous && <Delta change={(run.score ?? 0) - (previous.score ?? 0)} />}
					</span>
				) : (
					<span className="run-row-result">
						<StatusMark status="fail" size={18} />
						{run.error}
					</span>
				)}
			</td>
			<td>
				{note ? (
					<span className="run-row-alerts">
						{run.alerts.map((alert) => (
							<span key={alert.kind}>{sentenceCase(alert.headline)}</span>
						))}
						<span className={note.ok ? 'muted' : 'run-row-failed'}>{note.text}</span>
					</span>
				) : (
					<span className="muted">None</span>
				)}
			</td>
		</tr>
	)
}

export default memo(RunRow)
