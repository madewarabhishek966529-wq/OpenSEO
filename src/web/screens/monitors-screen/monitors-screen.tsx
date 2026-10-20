import { memo } from 'react'
import { EmptyState } from '@web/components/empty-state'
import { PageHeader } from '@web/components/page-header'
import { AlertTargetsNote } from './components/alert-targets-note'
import { MonitorCard } from './components/monitor-card'
import { MonitorForm } from './components/monitor-form'
import type { MonitorsScreenProps } from './monitors-screen.types'

/** Pages audited on a schedule, with alerts when something breaks. */
const MonitorsScreen = (props: MonitorsScreenProps) => {
	const { monitors, targets, timeZones, now } = props

	return (
		<div className="screen">
			<PageHeader
				eyebrow="Site"
				title="Monitors"
				description="Audits pages every day or week and tells you when the score drops, a page stops loading or its SSL certificate is about to expire."
			/>
			<MonitorForm />
			<AlertTargetsNote targets={targets} />
			{monitors.length ? (
				<ul className="monitor-list">
					{monitors.map((monitor) => (
						<MonitorCard
							key={monitor.id}
							monitor={monitor}
							timeZones={timeZones}
							now={now}
						/>
					))}
				</ul>
			) : (
				<EmptyState icon="bell" title="No monitors yet">
					<p>
						Add a page above. OpenSEO audits it on schedule, keeps every audit in
						History and alerts you when something changes for the worse.
					</p>
				</EmptyState>
			)}
		</div>
	)
}

export default memo(MonitorsScreen)
