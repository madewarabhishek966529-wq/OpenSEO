import { AuditError, runAudit } from '@server/audit'
import { runCrawl } from '@server/crawl'
import { takeRateLimit, withSlot } from '@server/limits'
import { createMonitor } from '@server/monitors/create'
import { runMonitor } from '@server/monitors/run'
import { alertTargets } from '@server/notify'
import { pagespeedConfig } from '@server/settings'
import { previewForVisitor } from '@server/share-preview'
import {
	getCrawl,
	getReport,
	getSettings,
	listMonitors,
	listReports,
	saveCrawl,
	saveReport
} from '@server/store'
import { compareReports } from '@shared/compare'
import { CRAWL_ISSUES } from '@shared/crawl-issues'
import { formatList } from '@shared/format'
import { CATEGORIES } from '@shared/grades'
import { alertTargetNames, describeSchedule, formatInZone, isTimeZone } from '@shared/monitors'
import type { CategoryId, CrawlIssueId } from '@shared/types'
import {
	auditSummary,
	comparisonText,
	crawlPages,
	crawlSummary,
	monitorList,
	previewText,
	reportList,
	reportText
} from './format'
import {
	errorResult,
	textResult,
	ToolInputError,
	type ServerInfo,
	type ToolDefinition
} from './protocol'

const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
const ISSUE_IDS = Object.keys(CRAWL_ISSUES) as CrawlIssueId[]

export const SERVER: ServerInfo = {
	name: 'openseo',
	title: 'OpenSEO',
	version: process.env.OPENSEO_VERSION || '0.0.0',
	instructions: [
		'OpenSEO audits web pages for SEO: about 70 checks in on-page SEO, performance, usability, security, links, social and AI search, graded A+ to F.',
		'audit_page runs a new audit (15 to 30 seconds) and returns the grade and what to fix first; get_report returns every check with its evidence and fix.',
		'list_reports finds earlier audits, and compare_reports shows what changed between two of them, like before and after a deploy, or a page next to a competitor.',
		'crawl_site checks a whole site for broken pages, missing titles and other problems, check_share_previews shows how a link looks when shared, and list_monitors and add_monitor manage scheduled audits with alerts.'
	].join(' ')
}

function text(args: Record<string, unknown>, name: string): string {
	const value = args[name]
	if (typeof value !== 'string' || !value.trim()) {
		throw new ToolInputError(`Give "${name}" as a non-empty string.`)
	}

	return value.trim()
}

function optionalText(args: Record<string, unknown>, name: string): string | undefined {
	return args[name] === undefined ? undefined : text(args, name)
}

function whole(
	args: Record<string, unknown>,
	name: string,
	min: number,
	max: number,
	fallback: number
): number {
	const value = args[name]
	if (value === undefined) return fallback
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
		throw new ToolInputError(`Give "${name}" as a whole number from ${min} to ${max}.`)
	}

	return value
}

function choice<T extends string>(
	args: Record<string, unknown>,
	name: string,
	options: readonly T[],
	fallback?: T
): T | undefined {
	const value = args[name]
	if (value === undefined) return fallback
	if (!options.includes(value as T)) {
		throw new ToolInputError(`"${name}" must be one of: ${options.join(', ')}.`)
	}

	return value as T
}

const urlProperty = {
	type: 'string',
	description: 'The page, like example.com/pricing. https:// is added when it is missing.'
}

const auditPage: ToolDefinition = {
	name: 'audit_page',
	title: 'Audit a page',
	description:
		'Runs an SEO audit of one page and saves it in OpenSEO. Takes 15 to 30 seconds. Returns the overall grade and score, a grade per category, and the problems to fix first with how to fix them, plus the report ID for get_report and compare_reports.',
	inputSchema: {
		type: 'object',
		properties: { url: urlProperty },
		required: ['url'],
		additionalProperties: false
	},
	annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
	async run(args, context) {
		const url = text(args, 'url')
		if (!takeRateLimit(context.clientIp)) {
			return errorResult("You've run a lot of audits. Try again in an hour.")
		}
		const settings = await getSettings()
		try {
			const report = await withSlot(() =>
				runAudit(url, {
					source: 'mcp',
					pagespeed: pagespeedConfig(settings),
					brokenLinkLimit: settings.brokenLinkLimit,
					onProgress: (p) => context.progress(p.pct, 100, p.label)
				})
			)
			await saveReport(report)
			const link = `${context.baseUrl}/report/${report.id}`

			return textResult(auditSummary(report, link), {
				id: report.id,
				url: report.finalUrl,
				score: report.score,
				grade: report.grade,
				link,
				categories: report.categories.map(({ id, name, score, grade }) => ({
					id,
					name,
					score,
					grade
				}))
			})
		} catch (e) {
			if (e instanceof AuditError) return errorResult(`Couldn't audit ${url}: ${e.message}`)
			throw e
		}
	}
}

const getReportTool: ToolDefinition = {
	name: 'get_report',
	title: 'Read a report',
	description:
		'Returns a saved audit report: by default the checks that failed or need work, each with what was found, how to fix it and the evidence (the tags, files or links involved). Use show "all" for every check, and category to narrow it down.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The report ID, from audit_page or list_reports.' },
			show: {
				type: 'string',
				enum: ['problems', 'all'],
				description: '"problems" (the default) or "all" checks.'
			},
			category: {
				type: 'string',
				enum: CATEGORY_IDS,
				description: 'Only the checks in this category.'
			}
		},
		required: ['id'],
		additionalProperties: false
	},
	annotations: { readOnlyHint: true, openWorldHint: false },
	async run(args, context) {
		const id = text(args, 'id')
		const show = choice(args, 'show', ['problems', 'all'] as const, 'problems')
		const category = choice<CategoryId>(args, 'category', CATEGORY_IDS)
		const report = await getReport(id)
		if (!report)
			return errorResult(`There's no report with the ID "${id}". list_reports lists them.`)
		const checks = report.checks.filter(
			(c) =>
				(show === 'all' || c.status === 'fail' || c.status === 'warn') &&
				(!category || c.category === category)
		)

		return textResult(reportText(report, checks, `${context.baseUrl}/report/${report.id}`))
	}
}

const listReportsTool: ToolDefinition = {
	name: 'list_reports',
	title: 'List audits',
	description:
		'Lists saved audits, newest first, with their report IDs, pages, scores and dates. Filter by site with domain.',
	inputSchema: {
		type: 'object',
		properties: {
			domain: { type: 'string', description: 'Only audits of this site, like example.com.' },
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 100,
				description: 'How many to list. 20 by default.'
			}
		},
		additionalProperties: false
	},
	annotations: { readOnlyHint: true, openWorldHint: false },
	async run(args) {
		const domain = optionalText(args, 'domain')
			?.toLowerCase()
			.replace(/^https?:\/\//, '')
			.replace(/^www\./, '')
			.replace(/\/.*$/, '')
		const limit = whole(args, 'limit', 1, 100, 20)
		const all = (await listReports()).filter((r) => !domain || r.domain === domain)
		const shown = all.slice(0, limit)

		return textResult(reportList(shown, all.length), { reports: shown })
	}
}

const compareTool: ToolDefinition = {
	name: 'compare_reports',
	title: 'Compare two audits',
	description:
		'Compares two saved audits check by check: the change in score, each category and the speed and size metrics, and every check that got better or worse. Two audits of the same page are put in time order (before and after); two different pages keep the order given, like yours and a competitor.',
	inputSchema: {
		type: 'object',
		properties: {
			a: { type: 'string', description: 'The first report ID: the earlier audit, or yours.' },
			b: { type: 'string', description: 'The second report ID: the later audit, or theirs.' }
		},
		required: ['a', 'b'],
		additionalProperties: false
	},
	annotations: { readOnlyHint: true, openWorldHint: false },
	async run(args, context) {
		const [a, b] = await Promise.all([getReport(text(args, 'a')), getReport(text(args, 'b'))])
		if (!a || !b) {
			return errorResult(`There's no report with the ID "${!a ? args.a : args.b}".`)
		}
		const comparison = compareReports(a, b)
		const link = `${context.baseUrl}/report/${comparison.a.id}/compare/${comparison.b.id}`

		return textResult(comparisonText(comparison, link))
	}
}

const crawlTool: ToolDefinition = {
	name: 'crawl_site',
	title: 'Crawl a site',
	description:
		'Follows the links on a site page by page, within its domain and robots.txt, and finds broken pages, redirects, missing or duplicate titles and descriptions, missing H1s, thin content, slow pages and noindex. Takes a few seconds per page. Returns the issues with example pages and the crawl ID for get_crawl.',
	inputSchema: {
		type: 'object',
		properties: {
			url: { ...urlProperty, description: 'Where to start, usually the home page.' },
			max_pages: {
				type: 'integer',
				minimum: 1,
				maximum: 500,
				description: 'The most pages to visit. 50 by default, capped by Settings.'
			}
		},
		required: ['url'],
		additionalProperties: false
	},
	annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
	async run(args, context) {
		const url = text(args, 'url')
		const requested = whole(args, 'max_pages', 1, 500, 50)
		if (!takeRateLimit(`crawl:${context.clientIp}`)) {
			return errorResult("You've run a lot of crawls. Try again in an hour.")
		}
		const settings = await getSettings()
		try {
			const crawl = await withSlot(() =>
				runCrawl(url, {
					maxPages: Math.min(requested, settings.crawlPageLimit),
					onProgress: (p) => context.progress(p.pct, 100, p.label)
				})
			)
			await saveCrawl(crawl)

			return textResult(crawlSummary(crawl, `${context.baseUrl}/crawls/${crawl.id}`))
		} catch (e) {
			if (e instanceof AuditError) return errorResult(`Couldn't crawl ${url}: ${e.message}`)
			throw e
		}
	}
}

const getCrawlTool: ToolDefinition = {
	name: 'get_crawl',
	title: 'Read a crawl',
	description:
		'Returns a saved crawl: its issues with example pages, or with issue, every page that has that issue.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The crawl ID, from crawl_site.' },
			issue: {
				type: 'string',
				enum: ISSUE_IDS,
				description: 'List the pages with this issue.'
			}
		},
		required: ['id'],
		additionalProperties: false
	},
	annotations: { readOnlyHint: true, openWorldHint: false },
	async run(args, context) {
		const id = text(args, 'id')
		const issue = choice(args, 'issue', ISSUE_IDS)
		const crawl = await getCrawl(id)
		if (!crawl) return errorResult(`There's no crawl with the ID "${id}".`)

		return textResult(
			issue
				? crawlPages(crawl, issue)
				: crawlSummary(crawl, `${context.baseUrl}/crawls/${crawl.id}`)
		)
	}
}

const previewTool: ToolDefinition = {
	name: 'check_share_previews',
	title: 'Check share previews',
	description:
		"Shows how a link to the page looks when shared on Google, Facebook, X, LinkedIn, Slack, Discord, WhatsApp and iMessage, following each platform's rules, with the share image and icons measured and what to fix. Takes a few seconds.",
	inputSchema: {
		type: 'object',
		properties: { url: urlProperty },
		required: ['url'],
		additionalProperties: false
	},
	annotations: { readOnlyHint: true, openWorldHint: true },
	async run(args, context) {
		const outcome = await previewForVisitor(text(args, 'url'), context.clientIp)
		if ('error' in outcome) return errorResult(outcome.error)

		return textResult(previewText(outcome.result))
	}
}

const listMonitorsTool: ToolDefinition = {
	name: 'list_monitors',
	title: 'List monitors',
	description:
		'Lists the pages OpenSEO audits on a schedule, with when they run next and how the last run went.',
	inputSchema: { type: 'object', properties: {}, additionalProperties: false },
	annotations: { readOnlyHint: true, openWorldHint: false },
	async run(_args, context) {
		return textResult(monitorList(await listMonitors(), `${context.baseUrl}/monitors`))
	}
}

const addMonitorTool: ToolDefinition = {
	name: 'add_monitor',
	title: 'Monitor a page',
	description:
		'Audits a page every day or week from now on and alerts (by email, Slack, Discord or webhook, as set up in OpenSEO) when the score drops 5 points, the page stops loading, or its SSL certificate is 14 days from expiring. Runs the first audit right away.',
	inputSchema: {
		type: 'object',
		properties: {
			url: urlProperty,
			frequency: {
				type: 'string',
				enum: ['daily', 'weekly'],
				description: 'Daily by default.'
			},
			hour: {
				type: 'integer',
				minimum: 0,
				maximum: 23,
				description: 'The hour it runs, in time_zone. 6 by default.'
			},
			weekday: {
				type: 'integer',
				minimum: 0,
				maximum: 6,
				description:
					'For weekly monitors: 0 is Sunday, 1 Monday … 6 Saturday. Monday by default.'
			},
			time_zone: {
				type: 'string',
				description: 'An IANA time zone like Europe/Zurich. UTC by default.'
			}
		},
		required: ['url'],
		additionalProperties: false
	},
	annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
	async run(args, context) {
		const url = text(args, 'url')
		const timeZone = optionalText(args, 'time_zone') ?? 'UTC'
		if (!isTimeZone(timeZone)) {
			throw new ToolInputError(
				`"${timeZone}" isn't a time zone OpenSEO knows, like Europe/Zurich.`
			)
		}
		const schedule = {
			frequency: choice(args, 'frequency', ['daily', 'weekly'] as const, 'daily'),
			hour: whole(args, 'hour', 0, 23, 6),
			weekday: whole(args, 'weekday', 0, 6, 1),
			timeZone
		}
		try {
			const monitor = await createMonitor({ url, schedule })
			runMonitor(monitor.id).catch((e: Error) =>
				console.error(`[mcp] first run of ${monitor.url}: ${e.message}`)
			)
			const names = alertTargetNames(alertTargets(await getSettings()))
			const alerts = names.length
				? `Alerts go to ${formatList(names)}.`
				: `No alert channels are set up yet: add them in OpenSEO under Settings, Alerts (${context.baseUrl}/settings#alerts).`

			return textResult(
				`Monitoring ${monitor.url} (\`${monitor.id}\`): ${describeSchedule(monitor.schedule)} ${monitor.schedule.timeZone}, next on ${formatInZone(monitor.nextRunAt, monitor.schedule.timeZone)}. The first audit is running now. ${alerts}`,
				{ id: monitor.id, url: monitor.url, nextRunAt: monitor.nextRunAt }
			)
		} catch (e) {
			if (e instanceof AuditError) return errorResult(e.message)
			throw e
		}
	}
}

export const TOOLS: ToolDefinition[] = [
	auditPage,
	getReportTool,
	listReportsTool,
	compareTool,
	crawlTool,
	getCrawlTool,
	previewTool,
	listMonitorsTool,
	addMonitorTool
]
