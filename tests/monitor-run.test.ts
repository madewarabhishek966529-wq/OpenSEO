import { rm } from 'node:fs/promises'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditError, runAudit } from '@server/audit'
import { overallScore, scoreCategories } from '@server/audit/scoring'
import { MonitorBusyError, runMonitor } from '@server/monitors/run'
import { runDueMonitors } from '@server/monitors/scheduler'
import { addMonitor, getMonitor, updateMonitor, updateSettings } from '@server/store'
import { gradeFor } from '@shared/grades'
import { DEFAULT_ALERT_RULES, DEFAULT_SCHEDULE, type Monitor } from '@shared/monitors'
import type { AuditReport, CheckResult, Status } from '@shared/types'

// The store reads OPENSEO_DATA_DIR when it loads, so set it before any import runs.
const { dir } = vi.hoisted(() => {
	const dir = `${process.env.TMPDIR ?? '/tmp'}/openseo-monitor-run-${process.pid}-${Date.now()}`
	process.env.OPENSEO_DATA_DIR = dir

	return { dir }
})

vi.mock('@server/audit', async (importOriginal) => ({
	...(await importOriginal<typeof import('@server/audit')>()),
	runAudit: vi.fn()
}))

vi.mock('@server/audit/network', () => ({
	inspectTls: vi.fn(async () => ({ ok: true, validTo: 'Nov  8 01:36:56 2026 GMT', daysLeft: 60 }))
}))

// A documentation address: public, so no DNS lookup, and nothing listens there.
const PAGE = 'https://203.0.113.10/'
const SLACK = 'https://hooks.slack.com/services/T000/B000/secret'

const fetchMock = vi.fn(
	async (_url: string | URL | Request, _init?: RequestInit) => new Response('ok')
)
vi.stubGlobal('fetch', fetchMock)

let n = 0

function report(statuses: Record<string, Status>): AuditReport {
	const checks: CheckResult[] = Object.entries(statuses).map(([id, status]) => ({
		id,
		category: 'onpage',
		title: id === 'title' ? 'Title tag' : id,
		status,
		weight: 1,
		priority: 'high',
		summary: `${id}: ${status}`
	}))
	const categories = scoreCategories(checks)
	const score = overallScore(categories)

	return {
		id: `run${++n}report`,
		version: 1,
		url: PAGE,
		finalUrl: PAGE,
		domain: '203.0.113.10',
		createdAt: new Date(Date.now() + n).toISOString(),
		durationMs: 10,
		score,
		grade: gradeFor(score),
		categories,
		checks,
		overview: {
			title: 'Fernhill Coffee',
			description: '',
			statusCode: 200,
			responseTimeMs: 100,
			loadTimeMs: 200,
			pageSizeBytes: 1000,
			htmlBytes: 1000,
			requests: 1,
			wordCount: 300,
			technologies: [],
			topKeywords: []
		},
		source: 'monitor'
	}
}

const monitor: Monitor = {
	id: 'monitor1',
	url: PAGE,
	createdAt: '2026-10-01T00:00:00.000Z',
	paused: false,
	schedule: { ...DEFAULT_SCHEDULE, timeZone: 'Europe/Zurich' },
	alerts: DEFAULT_ALERT_RULES,
	nextRunAt: '2026-10-01T04:00:00.000Z',
	runs: [],
	state: { down: false }
}

const audit = vi.mocked(runAudit)

beforeEach(() => {
	fetchMock.mockClear()
	audit.mockReset()
})

afterAll(async () => {
	await rm(dir, { recursive: true, force: true })
})

describe('runMonitor', () => {
	it('records runs, alerts on a score drop and on the page going down and back', async () => {
		await addMonitor(monitor)
		await updateSettings({ slackWebhookUrl: SLACK, appUrl: 'https://seo.fernhill.coffee' })

		audit.mockResolvedValueOnce(report({ title: 'pass', h1: 'pass', lang: 'pass' }))
		const first = await runMonitor('monitor1', { manual: true })
		expect(first).toMatchObject({ ok: true, score: 100, alerts: [], deliveries: [] })
		expect(fetchMock).not.toHaveBeenCalled()

		audit.mockResolvedValueOnce(report({ title: 'fail', h1: 'pass', lang: 'pass' }))
		const second = await runMonitor('monitor1', { manual: true })
		expect(second?.alerts.map((a) => a.kind)).toEqual(['score-drop'])
		expect(second?.alerts[0].details).toEqual(['New problems: Title tag.'])
		expect(second?.deliveries).toEqual([{ channel: 'slack', ok: true }])
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe(SLACK)
		const body = JSON.parse(String(init?.body))
		expect(body.text).toMatch(/^203\.0\.113\.10: score dropped \d+ points$/)
		expect(JSON.stringify(body.blocks)).toContain(
			`https://seo.fernhill.coffee/report/${first?.reportId}/compare/${second?.reportId}|See what changed`
		)

		const failure = new AuditError('The page answered with HTTP 500.', 'http_error')
		audit.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure)
		const calls = audit.mock.calls.length
		const third = await runMonitor('monitor1', { manual: true, retryDelayMs: 0 })
		// One more try before calling the page down.
		expect(audit.mock.calls.length - calls).toBe(2)
		expect(third).toMatchObject({ ok: false, error: 'The page answered with HTTP 500.' })
		expect(third?.alerts.map((a) => a.kind)).toEqual(['page-down'])

		audit.mockResolvedValueOnce(report({ title: 'pass', h1: 'pass', lang: 'pass' }))
		const fourth = await runMonitor('monitor1', { manual: true })
		expect(fourth?.alerts.map((a) => a.kind)).toEqual(['page-back'])

		const saved = await getMonitor('monitor1')
		expect(saved?.runs.map((r) => r.ok)).toEqual([true, false, true, true])
		expect(saved?.state.down).toBe(false)
	})

	it("doesn't run the same monitor twice at once", async () => {
		let finish: (value: AuditReport) => void = () => {}
		audit.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
		const running = runMonitor('monitor1', { manual: true })
		await expect(runMonitor('monitor1')).rejects.toBeInstanceOf(MonitorBusyError)
		finish(report({ title: 'pass', h1: 'pass', lang: 'pass' }))
		await running
	})

	it('says it again on the next run when no channel took the alert', async () => {
		fetchMock.mockResolvedValueOnce(new Response('down', { status: 500 }))
		audit.mockRejectedValue(new AuditError('The server refused the connection.', 'refused'))
		const unheard = await runMonitor('monitor1', { manual: true, retryDelayMs: 0 })
		expect(unheard?.alerts.map((a) => a.kind)).toEqual(['page-down'])
		expect(unheard?.deliveries).toEqual([
			{ channel: 'slack', ok: false, error: 'The webhook answered HTTP 500: down' }
		])
		expect((await getMonitor('monitor1'))?.state.down).toBe(false)

		const heard = await runMonitor('monitor1', { manual: true, retryDelayMs: 0 })
		expect(heard?.alerts.map((a) => a.kind)).toEqual(['page-down'])
		expect(heard?.deliveries).toEqual([{ channel: 'slack', ok: true }])
		expect((await getMonitor('monitor1'))?.state.down).toBe(true)
	})

	it('returns null for a monitor that no longer exists', async () => {
		expect(await runMonitor('missing1')).toBeNull()
	})
})

describe('runDueMonitors', () => {
	it('runs monitors whose time has come and schedules their next run', async () => {
		audit.mockResolvedValue(report({ title: 'pass', h1: 'pass', lang: 'pass' }))
		const now = new Date()
		await updateMonitor('monitor1', (m) => ({ ...m, nextRunAt: '2026-10-01T04:00:00.000Z' }))
		expect(await runDueMonitors(now)).toBe(1)
		const saved = await getMonitor('monitor1')
		expect(new Date(saved?.nextRunAt ?? 0).getTime()).toBeGreaterThan(now.getTime())
		expect(await runDueMonitors(now)).toBe(0)
	})
})
