import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createInterface } from 'node:readline'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { overallScore, scoreCategories } from '@server/audit/scoring'
import { detailLines } from '@server/mcp/format'
import { allowedOrigin, handleMcpPost } from '@server/mcp/http'
import {
	ERRORS,
	handleMessage,
	PROTOCOL_VERSIONS,
	textResult,
	ToolInputError,
	type ToolContext,
	type ToolDefinition
} from '@server/mcp/protocol'
import { SERVER, TOOLS } from '@server/mcp/tools'
import { saveReport } from '@server/store'
import { gradeFor } from '@shared/grades'
import type { AuditReport, CheckResult } from '@shared/types'

// Reports the tools read go to a temporary data folder, set before the store loads.
const { dir } = vi.hoisted(() => {
	const dir = `${process.env.TMPDIR ?? '/tmp'}/openseo-mcp-${process.pid}-${Date.now()}`
	process.env.OPENSEO_DATA_DIR = dir

	return { dir }
})

afterAll(async () => {
	await rm(dir, { recursive: true, force: true })
})

const context: ToolContext = {
	baseUrl: 'https://seo.fernhill.coffee',
	clientIp: 'test',
	progress: () => {}
}

/** A tool that echoes its input, reports progress twice, and refuses a "bad" argument. */
const echo: ToolDefinition = {
	name: 'echo',
	title: 'Echo',
	description: 'Says it back.',
	inputSchema: { type: 'object', properties: { say: { type: 'string' } } },
	annotations: { readOnlyHint: true, openWorldHint: false },
	async run(args, ctx) {
		if (args.say === 'bad') throw new ToolInputError('Not that.')
		ctx.progress(50, 100, 'Halfway')
		ctx.progress(50, 100, 'Still halfway')
		ctx.progress(100, 100, 'Done')

		return textResult(String(args.say), { said: args.say })
	}
}

const request = (method: string, params: Record<string, unknown> = {}, id = 1) => ({
	jsonrpc: '2.0',
	id,
	method,
	params
})

describe('handleMessage', () => {
	it('agrees on a protocol version', async () => {
		const known = await handleMessage(
			request('initialize', { protocolVersion: '2025-06-18' }),
			SERVER,
			[echo],
			context
		)
		expect(known?.result).toMatchObject({
			protocolVersion: '2025-06-18',
			capabilities: { tools: { listChanged: false } },
			serverInfo: { name: 'openseo', title: 'OpenSEO' }
		})
		const unknown = await handleMessage(
			request('initialize', { protocolVersion: '1999-01-01' }),
			SERVER,
			[echo],
			context
		)
		expect((unknown?.result as { protocolVersion: string }).protocolVersion).toBe(
			PROTOCOL_VERSIONS[0]
		)
	})

	it('lists tools without their code', async () => {
		const listed = await handleMessage(request('tools/list'), SERVER, [echo], context)
		expect(listed?.result).toEqual({
			tools: [
				{
					name: 'echo',
					title: 'Echo',
					description: 'Says it back.',
					inputSchema: echo.inputSchema,
					annotations: echo.annotations
				}
			]
		})
	})

	it('calls tools and reports their failures to the model', async () => {
		const called = await handleMessage(
			request('tools/call', { name: 'echo', arguments: { say: 'hi' } }),
			SERVER,
			[echo],
			context
		)
		expect(called?.result).toEqual({
			content: [{ type: 'text', text: 'hi' }],
			structuredContent: { said: 'hi' }
		})
		const refused = await handleMessage(
			request('tools/call', { name: 'echo', arguments: { say: 'bad' } }),
			SERVER,
			[echo],
			context
		)
		expect(refused?.result).toEqual({
			content: [{ type: 'text', text: 'Not that.' }],
			isError: true
		})
		const unknown = await handleMessage(
			request('tools/call', { name: 'nope' }),
			SERVER,
			[echo],
			context
		)
		expect(unknown?.error).toEqual({
			code: ERRORS.invalidParams,
			message: 'Unknown tool: nope'
		})
	})

	it('answers requests only', async () => {
		const note = { jsonrpc: '2.0', method: 'notifications/initialized' }
		expect(await handleMessage(note, SERVER, [echo], context)).toBeNull()
		expect((await handleMessage(request('nope'), SERVER, [echo], context))?.error?.code).toBe(
			ERRORS.methodNotFound
		)
		expect((await handleMessage([], SERVER, [echo], context))?.error?.code).toBe(
			ERRORS.invalidRequest
		)
	})
})

describe('allowedOrigin', () => {
	it('lets in clients without an Origin, this computer and the address in Settings', () => {
		expect(allowedOrigin(null, '')).toBe(true)
		expect(allowedOrigin('http://127.0.0.1:6274', '')).toBe(true)
		expect(allowedOrigin('http://[::1]:3000', '')).toBe(true)
		expect(allowedOrigin('https://seo.fernhill.coffee', 'https://seo.fernhill.coffee')).toBe(
			true
		)
		expect(
			allowedOrigin('https://seo.fernhill.coffee.evil.example', 'https://seo.fernhill.coffee')
		).toBe(false)
		expect(allowedOrigin('null', '')).toBe(false)
	})
})

describe('handleMcpPost', () => {
	const post = (body: unknown, headers: Record<string, string> = {}) =>
		handleMcpPost(
			new Request('http://localhost:3000/api/mcp', {
				method: 'POST',
				headers: {
					host: 'localhost:3000',
					'content-type': 'application/json',
					accept: 'application/json, text/event-stream',
					...headers
				},
				body: typeof body === 'string' ? body : JSON.stringify(body)
			}),
			SERVER,
			[echo]
		)

	it('accepts notifications without a reply', async () => {
		const res = await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
		expect(res.status).toBe(202)
	})

	it('refuses web pages, unknown versions and broken JSON', async () => {
		expect((await post(request('ping'), { origin: 'https://evil.example' })).status).toBe(403)
		// A site that points its own domain at this server sends a Host that matches its Origin.
		expect(
			(
				await post(request('ping'), {
					origin: 'http://rebound.example:3000',
					host: 'rebound.example:3000'
				})
			).status
		).toBe(403)
		expect((await post(request('ping'), { origin: 'http://localhost:3000' })).status).toBe(200)
		expect((await post(request('ping'), { 'mcp-protocol-version': '1999-01-01' })).status).toBe(
			400
		)
		const broken = await post('{nope')
		expect(broken.status).toBe(400)
		expect((await broken.json()).error.code).toBe(ERRORS.parse)
	})

	it('skips messages in a batch that are not messages at all', async () => {
		const res = await post([null, request('ping', {}, 3)])
		expect(await res.json()).toEqual([
			{
				jsonrpc: '2.0',
				id: null,
				error: { code: ERRORS.invalidRequest, message: 'Not a JSON-RPC 2.0 message.' }
			},
			{ jsonrpc: '2.0', id: 3, result: {} }
		])
	})

	it('answers plain requests and batches as JSON', async () => {
		const res = await post([request('ping', {}, 1), request('nope', {}, 2)])
		expect(res.headers.get('content-type')).toContain('application/json')
		expect(await res.json()).toEqual([
			{ jsonrpc: '2.0', id: 1, result: {} },
			{
				jsonrpc: '2.0',
				id: 2,
				error: { code: ERRORS.methodNotFound, message: 'Method not found: nope' }
			}
		])
	})

	it('stops writing when the client goes away, and lets the tool finish', async () => {
		let release = () => {}
		let finished = false
		const slow: ToolDefinition = {
			...echo,
			name: 'slow',
			async run(_args, ctx) {
				ctx.progress(10, 100, 'Started')
				await new Promise<void>((resolve) => (release = resolve))
				ctx.progress(90, 100, 'Almost done')
				finished = true

				return textResult('done')
			}
		}
		const res = await handleMcpPost(
			new Request('http://localhost:3000/api/mcp', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					accept: 'application/json, text/event-stream'
				},
				body: JSON.stringify(
					request('tools/call', { name: 'slow', _meta: { progressToken: 1 } })
				)
			}),
			SERVER,
			[slow]
		)
		const reader = (res.body as ReadableStream<Uint8Array>).getReader()
		expect(new TextDecoder().decode((await reader.read()).value)).toContain('Started')
		await reader.cancel()
		release()
		await vi.waitFor(() => expect(finished).toBe(true))
	})

	it('streams progress for tool calls, rising every time, then the result', async () => {
		const res = await post(
			request('tools/call', {
				name: 'echo',
				arguments: { say: 'hi' },
				_meta: { progressToken: 'p1' }
			})
		)
		expect(res.headers.get('content-type')).toBe('text/event-stream')
		const events = (await res.text())
			.split('\n\n')
			.filter((event) => event.startsWith('event: message'))
			.map((event) => JSON.parse(event.slice(event.indexOf('data: ') + 6)))
		expect(events).toEqual([
			{
				jsonrpc: '2.0',
				method: 'notifications/progress',
				params: { progressToken: 'p1', progress: 50, total: 100, message: 'Halfway' }
			},
			{
				jsonrpc: '2.0',
				method: 'notifications/progress',
				params: { progressToken: 'p1', progress: 100, total: 100, message: 'Done' }
			},
			{
				jsonrpc: '2.0',
				id: 1,
				result: {
					content: [{ type: 'text', text: 'hi' }],
					structuredContent: { said: 'hi' }
				}
			}
		])
	})
})

describe('tools', () => {
	const check = (id: string, status: CheckResult['status']): CheckResult => ({
		id,
		category: 'onpage',
		title: id === 'title' ? 'Title tag' : id,
		status,
		weight: 2,
		priority: 'high',
		summary: `${id} is ${status}`,
		recommendation: status === 'pass' ? undefined : `Fix ${id}.`
	})
	const report = (id: string, createdAt: string, checks: CheckResult[]): AuditReport => {
		const categories = scoreCategories(checks)
		const score = overallScore(categories)

		return {
			id,
			version: 1,
			url: 'https://fernhill.coffee/',
			finalUrl: 'https://fernhill.coffee/',
			domain: 'fernhill.coffee',
			createdAt,
			durationMs: 1,
			score,
			grade: gradeFor(score),
			categories,
			checks,
			overview: {
				title: 'Fernhill',
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
			source: 'web'
		}
	}
	const call = async (name: string, args: Record<string, unknown>) => {
		const response = await handleMessage(
			request('tools/call', { name, arguments: args }),
			SERVER,
			TOOLS,
			context
		)

		return response?.result as {
			content: { text: string }[]
			isError?: boolean
			structuredContent?: Record<string, unknown>
		}
	}

	it('read, list and compare saved reports', async () => {
		await saveReport(
			report('before1', '2026-10-01T09:00:00.000Z', [
				check('title', 'fail'),
				check('h1', 'pass')
			])
		)
		await saveReport(
			report('after12', '2026-10-08T09:00:00.000Z', [
				check('title', 'pass'),
				check('h1', 'warn')
			])
		)

		const listed = await call('list_reports', { domain: 'www.fernhill.coffee' })
		expect(listed.content[0].text).toContain('2 audits, newest first:')
		expect((listed.structuredContent?.reports as { id: string }[]).map((r) => r.id)).toEqual([
			'after12',
			'before1'
		])

		const problems = await call('get_report', { id: 'before1' })
		expect(problems.content[0].text).toContain(
			'- **Title tag** (`title`): failed, high priority. title is fail'
		)
		expect(problems.content[0].text).toContain('  Fix: Fix title.')
		expect(problems.content[0].text).not.toContain('(`h1`)')

		const compared = await call('compare_reports', { a: 'after12', b: 'before1' })
		const text = compared.content[0].text
		expect(text).toContain('# Before → After')
		expect(text).toContain('https://seo.fernhill.coffee/report/before1/compare/after12')
		expect(text).toContain('- **Title tag** (`title`, On-page SEO), fixed.')
	})

	it('explain what went wrong', async () => {
		expect((await call('get_report', { id: 'missing1' })).isError).toBe(true)
		const wrong = await call('get_report', { id: 'before1', show: 'everything' })
		expect(wrong).toMatchObject({ isError: true })
		expect(wrong.content[0].text).toBe('"show" must be one of: problems, all.')
		expect(
			(await call('add_monitor', { url: 'fernhill.coffee', time_zone: 'Mars/Base' }))
				.content[0].text
		).toBe(`"Mars/Base" isn't a time zone OpenSEO knows, like Europe/Zurich.`)
	})
})

describe('detailLines', () => {
	it('keeps evidence short', () => {
		const items = Array.from({ length: 12 }, (_, i) => `image-${i}.jpg`)
		expect(detailLines({ kind: 'list', items, more: 3 })).toEqual([
			...items.slice(0, 10).map((item) => `  - ${item}`),
			'  …and 5 more'
		])
		expect(detailLines({ kind: 'kv', items: [['Days left', '54']] })).toEqual([
			'  - Days left: 54'
		])
		expect(detailLines({ kind: 'screenshots', items: [] })).toEqual([])
	})
})

describe('mcp-stdio.mjs', () => {
	let server: Server

	afterAll(() => {
		server?.close()
	})

	it('passes messages between stdio and the HTTP endpoint', async () => {
		const seen: { auth?: string; version?: string }[] = []
		server = createServer((req, res) => {
			let body = ''
			req.on('data', (chunk) => (body += chunk))
			req.on('end', () => {
				seen.push({
					auth: req.headers.authorization,
					version: req.headers['mcp-protocol-version'] as string | undefined
				})
				const message = JSON.parse(body)
				if (message.id === undefined) {
					res.writeHead(202).end()

					return
				}
				if (message.method === 'initialize') {
					res.writeHead(200, { 'content-type': 'application/json' })
					res.end(
						JSON.stringify({
							jsonrpc: '2.0',
							id: message.id,
							result: { protocolVersion: '2025-06-18' }
						})
					)

					return
				}
				res.writeHead(200, { 'content-type': 'text/event-stream' })
				res.write(': keep-alive\n\n')
				res.write(
					`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/progress', params: { progress: 1 } })}\n\n`
				)
				res.end(
					`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: message.id, result: {} })}\n\n`
				)
			})
		})
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
		const { port } = server.address() as AddressInfo

		const bridge = spawn(process.execPath, ['scripts/mcp-stdio.mjs'], {
			env: {
				...process.env,
				OPENSEO_URL: `http://127.0.0.1:${port}/`,
				OPENSEO_PASSWORD: 'secret'
			}
		})
		const lines: unknown[] = []
		createInterface({ input: bridge.stdout }).on('line', (line) => lines.push(JSON.parse(line)))
		const write = (message: unknown) => bridge.stdin.write(`${JSON.stringify(message)}\n`)

		write(request('initialize', { protocolVersion: '2025-06-18' }, 1))
		await vi.waitFor(() => expect(lines).toHaveLength(1))
		write({ jsonrpc: '2.0', method: 'notifications/initialized' })
		write(request('tools/call', { name: 'echo' }, 2))
		bridge.stdin.end()
		await new Promise((resolve) => bridge.on('close', resolve))

		expect(lines).toEqual([
			{ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18' } },
			{ jsonrpc: '2.0', method: 'notifications/progress', params: { progress: 1 } },
			{ jsonrpc: '2.0', id: 2, result: {} }
		])
		expect(seen[0]).toEqual({ auth: `Basic ${Buffer.from('admin:secret').toString('base64')}` })
		expect(seen.at(-1)?.version).toBe('2025-06-18')
	})
})
