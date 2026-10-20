import { clientIp } from '@server/limits'
import { getSettings } from '@server/store'
import {
	ERRORS,
	PROTOCOL_VERSIONS,
	failure,
	handleMessage,
	type JsonRpcMessage,
	type ServerInfo,
	type ToolContext,
	type ToolDefinition
} from './protocol'

/** A comment line sent while a long tool runs, so proxies don't close a quiet connection. */
const KEEP_ALIVE_MS = 15_000

function isRequest(message: unknown): message is JsonRpcMessage & { method: string } {
	const m = message as JsonRpcMessage

	return typeof m === 'object' && m !== null && typeof m.method === 'string' && m.id != null
}

const LOOPBACK = ['localhost', '127.0.0.1', '[::1]']

/**
 * MCP clients don't send an Origin header; browsers do. So a request with one comes from a web
 * page, and only OpenSEO's own address (Settings, Links in alerts) or a page on this computer may
 * send it. Matching the Host header wouldn't be enough: a site that points its own domain at this
 * server (DNS rebinding) sends a Host that matches.
 */
export function allowedOrigin(origin: string | null, appUrl: string): boolean {
	if (!origin) return true
	try {
		const from = new URL(origin)

		return (
			LOOPBACK.includes(from.hostname) || (!!appUrl && new URL(appUrl).origin === from.origin)
		)
	} catch {
		return false
	}
}

function jsonRpcError(status: number, code: number, message: string): Response {
	return Response.json(failure(null, code, message), { status })
}

/**
 * Answers with Server-Sent Events: progress notifications while tools run, then the responses.
 * When the client goes away it stops writing; running tools still finish, and audits are saved.
 */
function eventStream(work: (send: (message: unknown) => void) => Promise<void>): Response {
	const encoder = new TextEncoder()
	let open = true
	let keepAlive: ReturnType<typeof setInterval> | undefined
	const body = new ReadableStream<Uint8Array>({
		async start(controller) {
			const write = (chunk: string) => {
				if (!open) return
				try {
					controller.enqueue(encoder.encode(chunk))
				} catch {
					open = false
				}
			}
			keepAlive = setInterval(() => write(': keep-alive\n\n'), KEEP_ALIVE_MS)
			try {
				await work((message) =>
					write(`event: message\ndata: ${JSON.stringify(message)}\n\n`)
				)
			} finally {
				clearInterval(keepAlive)
				if (open) {
					open = false
					controller.close()
				}
			}
		},
		cancel() {
			open = false
			clearInterval(keepAlive)
		}
	})

	return new Response(body, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			'x-accel-buffering': 'no'
		}
	})
}

/**
 * The Streamable HTTP transport, without sessions: every POST carries JSON-RPC messages and gets
 * the responses back, as JSON or, for tool calls from clients that accept it, as an event stream
 * with progress along the way.
 */
export async function handleMcpPost(
	request: Request,
	server: ServerInfo,
	tools: ToolDefinition[]
): Promise<Response> {
	const settings = await getSettings()
	if (!allowedOrigin(request.headers.get('origin'), settings.appUrl)) {
		return jsonRpcError(403, ERRORS.invalidRequest, 'Requests from web pages are refused.')
	}
	const version = request.headers.get('mcp-protocol-version')
	if (version && !PROTOCOL_VERSIONS.includes(version)) {
		return jsonRpcError(400, ERRORS.invalidRequest, `Unsupported protocol version: ${version}`)
	}
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return jsonRpcError(400, ERRORS.parse, 'The body must be JSON-RPC as JSON.')
	}
	const batch = Array.isArray(body)
	const messages: unknown[] = batch ? (body as unknown[]) : [body]
	if (!messages.length) return jsonRpcError(400, ERRORS.invalidRequest, 'The batch is empty.')
	if (!messages.some(isRequest)) return new Response(null, { status: 202 })

	const baseUrl = settings.appUrl || new URL(request.url).origin
	const ip = clientIp(request)
	const contextFor = (message: unknown, send?: (message: unknown) => void): ToolContext => {
		const meta = isRequest(message)
			? (message.params?._meta as { progressToken?: unknown } | undefined)
			: undefined
		const token = meta?.progressToken
		let last = -1

		return {
			baseUrl,
			clientIp: ip,
			progress(done, total, text) {
				// Progress has to go up with every notification.
				if (
					!send ||
					(typeof token !== 'string' && typeof token !== 'number') ||
					done <= last
				)
					return
				last = done
				send({
					jsonrpc: '2.0',
					method: 'notifications/progress',
					params: { progressToken: token, progress: done, total, message: text }
				})
			}
		}
	}
	const streams = (request.headers.get('accept') ?? '').includes('text/event-stream')
	const callsTools = messages.some((m) => isRequest(m) && m.method === 'tools/call')

	if (streams && callsTools) {
		return eventStream(async (send) => {
			await Promise.all(
				messages.map(async (message) => {
					const response = await handleMessage(
						message,
						server,
						tools,
						contextFor(message, send)
					)
					if (response) send(response)
				})
			)
		})
	}
	const responses = (
		await Promise.all(
			messages.map((message) => handleMessage(message, server, tools, contextFor(message)))
		)
	).filter((response) => response !== null)

	return Response.json(batch ? responses : responses[0])
}
