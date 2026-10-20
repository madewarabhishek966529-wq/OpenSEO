import type { ReportSource } from '@shared/types'

export const SOURCE_LABELS: Record<ReportSource, string> = {
	web: 'App',
	// Only on reports from before the embed was removed.
	embed: 'Embed',
	api: 'API',
	cli: 'Terminal',
	monitor: 'Monitor',
	mcp: 'MCP'
}
