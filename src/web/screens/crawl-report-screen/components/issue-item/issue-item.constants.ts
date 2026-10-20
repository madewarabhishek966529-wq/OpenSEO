import type { Priority, Status } from '@shared/types'

/** Issue priorities borrow the status colors: high is red, medium amber, low neutral. */
export const PRIORITY_TONE: Record<Priority, Status> = {
	high: 'fail',
	medium: 'warn',
	low: 'info'
}
