import { memo } from 'react'
import Link from 'next/link'
import { formatCount } from '@shared/format'
import { Delta } from '@web/components/delta'
import { Icon } from '@web/components/icon'
import type { LastRunProps } from './last-run.types'
import { lastRunLabel, previousScored } from './last-run.utils'

/** The latest run in one line: when, the score and how it moved, or why the page didn't load. */
const LastRun = (props: LastRunProps) => {
	const { runs, now } = props

	const [last] = runs
	if (!last) return <span className="monitor-last muted">Waiting for the first run</span>
	const previous = previousScored(runs)
	const sslSoon = last.sslDaysLeft !== undefined && last.sslDaysLeft <= 30

	return (
		<span className="monitor-last">
			<span className="muted">{lastRunLabel(last, now)}:</span>
			{last.ok ? (
				<Link className="monitor-last-score mono" href={`/report/${last.reportId}`}>
					{last.grade} {last.score}
				</Link>
			) : (
				<span className="monitor-last-error">Didn&apos;t load. {last.error}</span>
			)}
			{last.ok && previous && <Delta change={(last.score ?? 0) - (previous.score ?? 0)} />}
			{sslSoon && (
				<span className="chip chip--warn">
					<span className="chip-dot" />
					SSL expires in {formatCount(last.sslDaysLeft ?? 0, 'day')}
				</span>
			)}
			{last.alerts.length > 0 && (
				<span className="chip">
					<Icon name="bell" size={12} />
					{formatCount(last.alerts.length, 'alert')}
				</span>
			)}
		</span>
	)
}

export default memo(LastRun)
