/**
 * Connects an MCP client that only speaks stdio, like Claude Desktop, to OpenSEO's MCP server at
 * /api/mcp. It passes messages through, so OpenSEO has to be running.
 *
 * Usage:
 *   node scripts/mcp-stdio.mjs                 OpenSEO on http://localhost:3000
 *   OPENSEO_URL=https://seo.example.com OPENSEO_PASSWORD=… node scripts/mcp-stdio.mjs
 *   docker exec -i openseo node mcp-stdio.mjs  inside the Docker image, signed in already
 *
 * It signs in as admin with OPENSEO_PASSWORD, or ADMIN_PASSWORD when it runs inside the
 * container. Plain Node, no dependencies, so it runs anywhere OpenSEO does.
 */
import { createInterface } from 'node:readline'

const base = (process.env.OPENSEO_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(
	/\/+$/,
	''
)
const endpoint = `${base}/api/mcp`
const password = process.env.OPENSEO_PASSWORD || process.env.ADMIN_PASSWORD
const authorization = password
	? `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`
	: undefined

/** The protocol version agreed in initialize, sent with every later request as the spec asks. */
let protocolVersion

function write(message) {
	if (message?.result?.protocolVersion) protocolVersion = message.result.protocolVersion
	process.stdout.write(`${JSON.stringify(message)}\n`)
}

/** The data of each Server-Sent Event in a response body. */
async function* events(body) {
	const decoder = new TextDecoder()
	let buffer = ''
	for await (const chunk of body) {
		buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n')
		let end
		while ((end = buffer.indexOf('\n\n')) !== -1) {
			const event = buffer.slice(0, end)
			buffer = buffer.slice(end + 2)
			const data = event
				.split('\n')
				.filter((line) => line.startsWith('data:'))
				.map((line) => line.slice(5).replace(/^ /, ''))
				.join('\n')
			if (data) yield data
		}
	}
}

async function forward(line) {
	let message
	try {
		message = JSON.parse(line)
	} catch {
		write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })

		return
	}
	const ids = (Array.isArray(message) ? message : [message])
		.map((m) => m?.id)
		.filter((id) => id !== undefined && id !== null)
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				...(authorization && { authorization }),
				...(protocolVersion && { 'mcp-protocol-version': protocolVersion })
			},
			body: line
		})
		if (res.status === 202) return
		const type = res.headers.get('content-type') ?? ''
		if (type.includes('text/event-stream') && res.body) {
			for await (const data of events(res.body)) write(JSON.parse(data))
		} else if (type.includes('json')) {
			const body = await res.json()
			for (const reply of Array.isArray(body) ? body : [body]) write(reply)
		} else {
			const hint = res.status === 401 ? ' Set OPENSEO_PASSWORD to the admin password.' : ''
			throw new Error(`OpenSEO answered HTTP ${res.status}.${hint}`)
		}
	} catch (e) {
		for (const id of ids) {
			write({
				jsonrpc: '2.0',
				id,
				error: {
					code: -32603,
					message: `Couldn't reach OpenSEO at ${endpoint}: ${e.message}`
				}
			})
		}
	}
}

const pending = new Set()
const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
input.on('line', (line) => {
	if (!line.trim()) return
	const job = forward(line).finally(() => pending.delete(job))
	pending.add(job)
})
input.on('close', async () => {
	await Promise.all(pending)
	process.exit(0)
})
