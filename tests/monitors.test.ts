import { describe, expect, it } from 'vitest'
import { evaluateAlerts, type RunOutcome } from '@server/monitors/alerts'
import {
	DEFAULT_ALERT_RULES,
	DEFAULT_SCHEDULE,
	describeSchedule,
	formatInZone,
	mergeAlertRules,
	mergeSchedule,
	nextRunAt,
	type MonitorSchedule,
	type MonitorState
} from '@shared/monitors'

const schedule = (over: Partial<MonitorSchedule>): MonitorSchedule => ({
	...DEFAULT_SCHEDULE,
	...over
})

describe('nextRunAt', () => {
	it('runs daily monitors at the next occurrence of the hour', () => {
		const daily = schedule({ hour: 6, timeZone: 'UTC' })
		expect(nextRunAt(daily, new Date('2026-10-11T05:59:00Z')).toISOString()).toBe(
			'2026-10-11T06:00:00.000Z'
		)
		expect(nextRunAt(daily, new Date('2026-10-11T06:00:00Z')).toISOString()).toBe(
			'2026-10-12T06:00:00.000Z'
		)
	})

	it('follows the time zone through daylight saving changes', () => {
		const zurich = schedule({ hour: 6, timeZone: 'Europe/Zurich' })
		// Summer time (UTC+2) ends on 25 October 2026.
		expect(nextRunAt(zurich, new Date('2026-10-24T12:00:00Z')).toISOString()).toBe(
			'2026-10-25T05:00:00.000Z'
		)
		expect(nextRunAt(zurich, new Date('2026-10-25T12:00:00Z')).toISOString()).toBe(
			'2026-10-26T05:00:00.000Z'
		)
	})

	it('moves an hour that daylight saving skips to the hour after', () => {
		const night = schedule({ hour: 2, timeZone: 'Europe/Zurich' })
		// Clocks jump from 02:00 to 03:00 on 29 March 2026, which is 01:00 UTC.
		expect(nextRunAt(night, new Date('2026-03-28T12:00:00Z')).toISOString()).toBe(
			'2026-03-29T01:00:00.000Z'
		)
	})

	it('runs right after the jump when the hour is skipped west of UTC too', () => {
		// New York skips 02:00 on 8 March 2026: 01:59 EST is followed by 03:00 EDT (07:00 UTC).
		const newYork = schedule({ hour: 2, timeZone: 'America/New_York' })
		expect(nextRunAt(newYork, new Date('2026-03-07T12:00:00Z')).toISOString()).toBe(
			'2026-03-08T07:00:00.000Z'
		)
		// Santiago skips midnight on Sunday 6 September 2026, straight to 01:00 (04:00 UTC).
		const sundays = schedule({
			frequency: 'weekly',
			weekday: 0,
			hour: 0,
			timeZone: 'America/Santiago'
		})
		expect(nextRunAt(sundays, new Date('2026-09-05T12:00:00Z')).toISOString()).toBe(
			'2026-09-06T04:00:00.000Z'
		)
		const daily = schedule({ hour: 0, timeZone: 'America/Santiago' })
		const saturday = nextRunAt(daily, new Date('2026-09-04T12:00:00Z'))
		expect(saturday.toISOString()).toBe('2026-09-05T04:00:00.000Z')
		expect(nextRunAt(daily, saturday).toISOString()).toBe('2026-09-06T04:00:00.000Z')
	})

	it('runs once, the first time, when the hour happens twice', () => {
		// New York's 01:00 comes twice on 1 November 2026: 05:00 UTC (EDT), then 06:00 (EST).
		const newYork = schedule({ hour: 1, timeZone: 'America/New_York' })
		const first = nextRunAt(newYork, new Date('2026-10-31T12:00:00Z'))
		expect(first.toISOString()).toBe('2026-11-01T05:00:00.000Z')
		expect(nextRunAt(newYork, first).toISOString()).toBe('2026-11-02T06:00:00.000Z')
	})

	it('runs weekly monitors on their day', () => {
		const mondays = schedule({
			frequency: 'weekly',
			weekday: 1,
			hour: 9,
			timeZone: 'America/New_York'
		})
		// Sunday 11 October 2026; New York is UTC-4.
		const next = nextRunAt(mondays, new Date('2026-10-11T12:00:00Z'))
		expect(next.toISOString()).toBe('2026-10-12T13:00:00.000Z')
		expect(nextRunAt(mondays, next).toISOString()).toBe('2026-10-19T13:00:00.000Z')
	})

	it('uses the date in the time zone, not in UTC', () => {
		const tokyo = schedule({ hour: 8, timeZone: 'Asia/Tokyo' })
		// 23:30 UTC on the 11th is already 08:30 on the 12th in Tokyo.
		expect(nextRunAt(tokyo, new Date('2026-10-11T23:30:00Z')).toISOString()).toBe(
			'2026-10-12T23:00:00.000Z'
		)
	})
})

describe('describeSchedule and formatInZone', () => {
	it('says when a monitor runs', () => {
		expect(describeSchedule(schedule({ hour: 6 }))).toBe('Daily at 06:00')
		expect(describeSchedule(schedule({ frequency: 'weekly', weekday: 3, hour: 14 }))).toBe(
			'Wednesdays at 14:00'
		)
	})

	it('formats a time on the clocks of the time zone', () => {
		expect(formatInZone('2026-10-14T07:00:00Z', 'Europe/Zurich')).toBe('Wed 14 Oct, 09:00')
		expect(formatInZone('2026-10-14T07:00:00Z', 'Not/AZone')).toBe('Wed 14 Oct, 07:00')
	})
})

describe('mergeSchedule and mergeAlertRules', () => {
	it('takes valid changes, including partial ones', () => {
		expect(
			mergeSchedule(DEFAULT_SCHEDULE, { frequency: 'weekly', timeZone: 'Asia/Kolkata' })
		).toEqual({ ...DEFAULT_SCHEDULE, frequency: 'weekly', timeZone: 'Asia/Kolkata' })
		expect(mergeAlertRules(DEFAULT_ALERT_RULES, { sslDays: 30, pageDown: false })).toEqual({
			scoreDrop: 5,
			pageDown: false,
			sslDays: 30
		})
	})

	it('drops anything invalid', () => {
		expect(
			mergeSchedule(DEFAULT_SCHEDULE, {
				frequency: 'hourly',
				hour: 24,
				weekday: 1.5,
				timeZone: 'Mars/Olympus'
			})
		).toEqual(DEFAULT_SCHEDULE)
		expect(mergeAlertRules(DEFAULT_ALERT_RULES, { scoreDrop: -1, pageDown: 'yes' })).toEqual(
			DEFAULT_ALERT_RULES
		)
	})
})

describe('evaluateAlerts', () => {
	const rules = DEFAULT_ALERT_RULES
	const up: MonitorState = { down: false }
	const page = 'https://fernhill.coffee/'
	const run = (over: Partial<RunOutcome>): RunOutcome => ({
		url: page,
		report: { score: 80, grade: 'B+' },
		...over
	})
	const kinds = (result: ReturnType<typeof evaluateAlerts>) => result.alerts.map((a) => a.kind)

	it('says once that the page went down, and once that it came back', () => {
		const down = evaluateAlerts(rules, up, run({ report: undefined, error: 'HTTP 500' }))
		expect(kinds(down)).toEqual(['page-down'])
		expect(down.alerts[0].message).toBe("fernhill.coffee didn't load: HTTP 500")
		expect(down.state.down).toBe(true)

		const still = evaluateAlerts(
			rules,
			down.state,
			run({ report: undefined, error: 'HTTP 500' })
		)
		expect(still.alerts).toEqual([])

		const back = evaluateAlerts(rules, still.state, run({}))
		expect(kinds(back)).toEqual(['page-back'])
		expect(back.alerts[0].message).toBe('fernhill.coffee loads again and scores 80 (B+).')
		expect(back.state.down).toBe(false)
	})

	it('keeps track of the page without alerting when that alert is off', () => {
		const quiet = { ...rules, pageDown: false }
		const down = evaluateAlerts(quiet, up, run({ report: undefined, error: 'Timeout' }))
		expect(down.alerts).toEqual([])
		expect(down.state.down).toBe(true)
	})

	it('alerts when the score drops by the threshold or more', () => {
		const previous = { score: 86, grade: 'A-' }
		expect(
			kinds(evaluateAlerts(rules, up, run({ previous: { score: 84, grade: 'B+' } })))
		).toEqual([])
		const drop = evaluateAlerts(
			rules,
			up,
			run({ previous, newProblems: ['Title tag', 'H1 heading'] })
		)
		expect(drop.alerts).toEqual([
			{
				kind: 'score-drop',
				headline: 'score dropped 6 points',
				message: 'The score dropped 6 points, from 86 (A-) to 80 (B+).',
				details: ['New problems: Title tag and H1 heading.']
			}
		])
		expect(evaluateAlerts({ ...rules, scoreDrop: 0 }, up, run({ previous })).alerts).toEqual([])
	})

	it('names a handful of new problems and counts the rest', () => {
		const titles = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
		const drop = evaluateAlerts(
			rules,
			up,
			run({ previous: { score: 99, grade: 'A+' }, newProblems: titles })
		)
		expect(drop.alerts[0].details).toEqual(['New problems: A, B, C, D, E, F and 2 more.'])
	})

	it('warns about an expiring certificate as it gets closer, once per step', () => {
		const certificate = (daysLeft: number) => ({
			ok: true,
			validTo: 'Nov  8 01:36:56 2026 GMT',
			daysLeft
		})
		const far = evaluateAlerts(rules, up, run({ certificate: certificate(20) }))
		expect(far.alerts).toEqual([])

		const first = evaluateAlerts(rules, far.state, run({ certificate: certificate(13) }))
		expect(first.alerts[0]).toMatchObject({
			kind: 'ssl-expiring',
			headline: 'SSL certificate expires in 13 days',
			message:
				'The SSL certificate expires in 13 days, on 8 November 2026. Renew it, or check that automatic renewal works.'
		})
		expect(
			evaluateAlerts(rules, first.state, run({ certificate: certificate(9) })).alerts
		).toEqual([])

		const week = evaluateAlerts(rules, first.state, run({ certificate: certificate(6) }))
		expect(kinds(week)).toEqual(['ssl-expiring'])
		const today = evaluateAlerts(rules, week.state, run({ certificate: certificate(0) }))
		expect(today.alerts[0].headline).toBe('SSL certificate expires today')
	})

	it('starts over when the certificate is renewed', () => {
		const old = { ok: true, validTo: 'Nov  8 01:36:56 2026 GMT', daysLeft: 5 }
		const warned = evaluateAlerts(rules, up, run({ certificate: old })).state
		const renewed = { ok: true, validTo: 'Feb  6 01:36:56 2027 GMT', daysLeft: 5 }
		expect(kinds(evaluateAlerts(rules, warned, run({ certificate: renewed })))).toEqual([
			'ssl-expiring'
		])
	})

	it('says once that a certificate is invalid', () => {
		const invalid = { ok: false, error: 'certificate has expired', validTo: 'Oct  1 2026 GMT' }
		const first = evaluateAlerts(rules, up, run({ certificate: invalid }))
		expect(first.alerts[0].message).toBe(
			"The SSL certificate isn't valid: certificate has expired."
		)
		expect(evaluateAlerts(rules, first.state, run({ certificate: invalid })).alerts).toEqual([])
		expect(
			evaluateAlerts({ ...rules, sslDays: 0 }, up, run({ certificate: invalid })).alerts
		).toEqual([])
	})
})
