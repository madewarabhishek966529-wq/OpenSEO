import type { StreamEvent } from '@shared/types'

/**
 * Posts JSON to a streaming endpoint and calls `onEvent` for each line it sends back. Errors the
 * server returns before streaming (bad input, rate limits) arrive as an error event too.
 */
export async function postForEvents(
	url: string,
	body: unknown,
	onEvent: (event: StreamEvent) => void
): Promise<void> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	})
	if (!res.ok || !res.body) {
		const data = (await res.json().catch(() => ({}))) as { error?: string }
		onEvent({ type: 'error', message: data.error ?? `Something went wrong (${res.status}).` })

		return
	}
	const reader = res.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		buffer += decoder.decode(value, { stream: true })
		const lines = buffer.split('\n')
		buffer = lines.pop() ?? ''
		for (const line of lines) {
			if (line.trim()) onEvent(JSON.parse(line) as StreamEvent)
		}
	}
	if (buffer.trim()) onEvent(JSON.parse(buffer) as StreamEvent)
}
