import { memo } from 'react'
import { RunRow } from './components/run-row'
import { SHOWN_RUNS } from './run-list.constants'
import type { RunListProps } from './run-list.types'

/** The latest runs: when, the result, and which alerts went where. */
const RunList = (props: RunListProps) => {
	const { runs, timeZone } = props

	return (
		<div className="run-list">
			<span className="section-label">Recent runs</span>
			{runs.length ? (
				<div className="detail-scroll">
					<table className="data-table run-table">
						<thead>
							<tr>
								<th scope="col">When</th>
								<th scope="col">Result</th>
								<th scope="col">Alerts</th>
							</tr>
						</thead>
						<tbody>
							{runs.slice(0, SHOWN_RUNS).map((run, index) => (
								<RunRow
									key={run.at}
									run={run}
									previous={runs
										.slice(index + 1)
										.find((r) => r.ok && r.score !== undefined)}
									timeZone={timeZone}
								/>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="muted">No runs yet.</p>
			)}
		</div>
	)
}

export default memo(RunList)
