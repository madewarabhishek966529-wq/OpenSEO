import type { CategoryId, CheckResult, Detail } from '@shared/types'

export type CheckInput = Omit<CheckResult, 'category'>

/** Returns a helper that stamps checks with their category. */
export function inCategory(category: CategoryId): (check: CheckInput) => CheckResult {
	return (check) => ({ category, ...check })
}

/** A list detail showing the first `max` items and how many were left out. */
export function listDetail(items: string[], max = 15): Detail {
	return {
		kind: 'list',
		items: items.slice(0, max),
		more: Math.max(0, items.length - max) || undefined
	}
}

/** A table detail showing the first `max` rows and how many were left out. */
export function tableDetail(columns: string[], rows: (string | number)[][], max = 15): Detail {
	return {
		kind: 'table',
		columns,
		rows: rows.slice(0, max),
		more: Math.max(0, rows.length - max) || undefined
	}
}

export function yesNo(value: boolean): string {
	return value ? 'Yes' : 'No'
}
