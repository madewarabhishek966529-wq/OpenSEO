import type { StreamEvent } from '@shared/types'

/**
 * Streams events as newline-delimited JSON while `work` runs, so the browser can show progress.
 * Whatever `work` throws becomes an error event with its message.
 */
export function streamEvents(
	work: (send: (event: StreamEvent) => void) => Promise<void>
): Response {
	const encoder = new TextEncoder()
	const body = new ReadableStream<Uint8Array>({
		async start(controller) {
			let open = true
			const send = (event: StreamEvent): void => {
				if (open) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
			}
			try {
				await work(send)
			} catch (e) {
				send({ type: 'error', message: e instanceof Error ? e.message : String(e) })
			} finally {
				open = false
				controller.close()
			}
		}
	})

	return new Response(body, {
		headers: {
			'content-type': 'application/x-ndjson; charset=utf-8',
			'cache-control': 'no-cache, no-transform',
			'x-accel-buffering': 'no'
		}
	})
}

export function jsonError(message: string, status: number): Response {
	return Response.json({ error: message }, { status })
}
