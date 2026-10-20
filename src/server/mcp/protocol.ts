/**
 * The Model Context Protocol, the part OpenSEO needs: a server with tools and no state between
 * requests. Messages are JSON-RPC 2.0; the transports (HTTP in src/app/api/mcp, stdio through
 * scripts/mcp-stdio.mjs) only move them. https://modelcontextprotocol.io/specification
 */

/** Newest first. A client asking for one of these gets it; any other gets the newest. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

export const ERRORS = {
	parse: -32700,
	invalidRequest: -32600,
	methodNotFound: -32601,
	invalidParams: -32602,
	internal: -32603
}

export type JsonRpcId = string | number

export interface JsonRpcMessage {
	jsonrpc: '2.0'
	id?: JsonRpcId | null
	method?: string
	params?: Record<string, unknown>
	result?: unknown
	error?: { code: number; message: string; data?: unknown }
}

export interface JsonRpcResponse {
	jsonrpc: '2.0'
	id: JsonRpcId | null
	result?: unknown
	error?: { code: number; message: string }
}

export interface ContentBlock {
	type: 'text'
	text: string
}

export interface ToolResult {
	content: ContentBlock[]
	structuredContent?: Record<string, unknown>
	isError?: boolean
}

/** What a tool can use while it runs. */
export interface ToolContext {
	/** Where OpenSEO is reachable, for links to reports. */
	baseUrl: string
	/** Who's asking, for the same hourly limits as the API. */
	clientIp: string
	/** Reports progress to the client, when it asked for progress. */
	progress(done: number, total: number, message: string): void
}

export interface ToolDefinition {
	name: string
	title: string
	description: string
	inputSchema: Record<string, unknown>
	annotations: {
		readOnlyHint: boolean
		destructiveHint?: boolean
		idempotentHint?: boolean
		openWorldHint: boolean
	}
	run(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>
}

export interface ServerInfo {
	name: string
	title: string
	version: string
	instructions: string
}

/** Wrong arguments: reported to the model as a failed tool call, so it can try again. */
export class ToolInputError extends Error {}

export function textResult(text: string, structuredContent?: Record<string, unknown>): ToolResult {
	return { content: [{ type: 'text', text }], structuredContent }
}

export function errorResult(message: string): ToolResult {
	return { content: [{ type: 'text', text: message }], isError: true }
}

function reply(id: JsonRpcId, result: unknown): JsonRpcResponse {
	return { jsonrpc: '2.0', id, result }
}

export function failure(id: JsonRpcId | null, code: number, message: string): JsonRpcResponse {
	return { jsonrpc: '2.0', id, error: { code, message } }
}

/** The version to speak: the client's when we know it, otherwise the newest. */
export function negotiateVersion(requested: unknown): string {
	return typeof requested === 'string' && PROTOCOL_VERSIONS.includes(requested)
		? requested
		: PROTOCOL_VERSIONS[0]
}

function isMessage(value: unknown): value is JsonRpcMessage {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as JsonRpcMessage).jsonrpc === '2.0' &&
		!Array.isArray(value)
	)
}

async function callTool(
	tools: ToolDefinition[],
	params: Record<string, unknown>,
	context: ToolContext
): Promise<ToolResult | { protocolError: string }> {
	const tool = tools.find((t) => t.name === params.name)
	if (!tool) return { protocolError: `Unknown tool: ${String(params.name)}` }
	const args = params.arguments
	if (args !== undefined && (typeof args !== 'object' || args === null || Array.isArray(args))) {
		return errorResult('The arguments must be an object.')
	}
	try {
		return await tool.run((args as Record<string, unknown>) ?? {}, context)
	} catch (e) {
		if (e instanceof ToolInputError) return errorResult(e.message)
		console.error(`[mcp] ${tool.name}:`, e)

		return errorResult(`${tool.title} failed: ${e instanceof Error ? e.message : String(e)}`)
	}
}

/**
 * Answers one message. Requests get a response; notifications (no id) and responses get null,
 * since there's nothing to say back.
 */
export async function handleMessage(
	message: unknown,
	server: ServerInfo,
	tools: ToolDefinition[],
	context: ToolContext
): Promise<JsonRpcResponse | null> {
	if (!isMessage(message))
		return failure(null, ERRORS.invalidRequest, 'Not a JSON-RPC 2.0 message.')
	const { id, method } = message
	if (id === undefined || id === null) return null
	if (typeof method !== 'string') return null
	const params = message.params && typeof message.params === 'object' ? message.params : {}

	switch (method) {
		case 'initialize':
			return reply(id, {
				protocolVersion: negotiateVersion(params.protocolVersion),
				capabilities: { tools: { listChanged: false } },
				serverInfo: { name: server.name, title: server.title, version: server.version },
				instructions: server.instructions
			})
		case 'ping':
			return reply(id, {})
		case 'tools/list':
			return reply(id, {
				tools: tools.map(({ run: _run, ...definition }) => definition)
			})
		case 'tools/call': {
			const result = await callTool(tools, params, context)

			return 'protocolError' in result
				? failure(id, ERRORS.invalidParams, result.protocolError)
				: reply(id, result)
		}
		default:
			return failure(id, ERRORS.methodNotFound, `Method not found: ${method}`)
	}
}
