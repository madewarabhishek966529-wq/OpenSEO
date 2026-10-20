/** Runs once when the server starts: starts the scheduler that runs monitors. */
export async function register(): Promise<void> {
	if (process.env.NEXT_RUNTIME !== 'nodejs') return
	if (process.env.NEXT_PHASE === 'phase-production-build') return
	const { startScheduler } = await import('@server/monitors/scheduler')
	startScheduler()
}
