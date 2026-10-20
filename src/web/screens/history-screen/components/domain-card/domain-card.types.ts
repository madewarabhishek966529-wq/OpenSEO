import type { DomainHistory } from '@web/screens/history-screen'

export interface DomainCardProps {
	history: DomainHistory
	now: number
	onDelete(id: string): void
}
