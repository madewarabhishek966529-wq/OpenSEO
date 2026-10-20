'use client'

import { memo, useState } from 'react'
import type { AlertRules, MonitorSchedule } from '@shared/monitors'
import { ScheduleSelect } from '@web/screens/monitors-screen/components/schedule-select'
import { RuleSelect } from './components/rule-select'
import type { MonitorEditorProps } from './monitor-editor.types'

/** A monitor's schedule and alert rules. Every change saves straight away, and goes back if it can't. */
const MonitorEditor = (props: MonitorEditorProps) => {
	const { monitor, timeZones, onChange } = props

	const [schedule, setSchedule] = useState(monitor.schedule)
	const [rules, setRules] = useState(monitor.alerts)

	const handleScheduleChange = async (patch: Partial<MonitorSchedule>) => {
		const saved = schedule
		setSchedule({ ...saved, ...patch })
		if (!(await onChange({ schedule: patch }))) setSchedule(saved)
	}

	const handleRulesChange = async (patch: Partial<AlertRules>) => {
		const saved = rules
		setRules({ ...saved, ...patch })
		if (!(await onChange({ alerts: patch }))) setRules(saved)
	}

	return (
		<div className="monitor-editor">
			<fieldset className="monitor-editor-group">
				<legend className="section-label">Runs</legend>
				<div className="monitor-editor-row">
					<ScheduleSelect
						field="frequency"
						schedule={schedule}
						onChange={handleScheduleChange}
					/>
					{schedule.frequency === 'weekly' && (
						<ScheduleSelect
							field="weekday"
							schedule={schedule}
							onChange={handleScheduleChange}
						/>
					)}
					<ScheduleSelect
						field="hour"
						schedule={schedule}
						onChange={handleScheduleChange}
					/>
					<ScheduleSelect
						field="timeZone"
						schedule={schedule}
						timeZones={timeZones}
						onChange={handleScheduleChange}
					/>
				</div>
			</fieldset>
			<fieldset className="monitor-editor-group">
				<legend className="section-label">Alert when</legend>
				<div className="monitor-rule">
					<label htmlFor={`${monitor.id}-drop`}>The score drops</label>
					<RuleSelect
						id={`${monitor.id}-drop`}
						field="scoreDrop"
						rules={rules}
						onChange={handleRulesChange}
					/>
				</div>
				<div className="monitor-rule">
					<label htmlFor={`${monitor.id}-down`}>
						The page stops loading, or loads again
					</label>
					<button
						type="button"
						role="switch"
						id={`${monitor.id}-down`}
						className="toggle"
						aria-checked={rules.pageDown}
						onClick={() => handleRulesChange({ pageDown: !rules.pageDown })}
					/>
				</div>
				<div className="monitor-rule">
					<label htmlFor={`${monitor.id}-ssl`}>
						The SSL certificate is invalid or about to expire
					</label>
					<RuleSelect
						id={`${monitor.id}-ssl`}
						field="sslDays"
						rules={rules}
						onChange={handleRulesChange}
					/>
				</div>
			</fieldset>
		</div>
	)
}

export default memo(MonitorEditor)
