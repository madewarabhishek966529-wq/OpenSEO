import { formatCount } from '@shared/format'
import type { AuditReport } from '@shared/types'

/** One sentence that sums up the result and says where to start. */
export function verdict(report: AuditReport, issues: number): string {
	const high = report.checks.filter(
		(c) => c.status !== 'pass' && c.status !== 'info' && c.priority === 'high'
	).length
	if (!issues) return 'Everything we checked passed. Keep an eye on it after big changes.'
	if (high) {
		return `${formatCount(issues, 'thing')} to improve. Start with the ${formatCount(high, 'high-priority issue')} below.`
	}

	return `${formatCount(issues, 'thing')} to improve, none of them urgent.`
}
