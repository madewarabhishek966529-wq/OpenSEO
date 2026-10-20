/**
 * A value shared by the whole server process. Next.js loads the instrumentation hook, which runs
 * the monitor scheduler, separately from the routes, so a plain module-level variable would exist
 * twice: file locks wouldn't lock, the audit limit would double and a monitor could run twice.
 */
export function processWide<T>(name: string, create: () => T): T {
	const shared = globalThis as typeof globalThis & Record<symbol, unknown>
	const key = Symbol.for(`openseo.${name}`)
	if (!(key in shared)) shared[key] = create()

	return shared[key] as T
}
