import { AuditError } from '@server/audit'
import { runSharePreview } from '@server/audit/sharing'
import { takeRateLimit, withSlot } from '@server/limits'
import type { SharePreviewResult } from '@shared/types'

export type SharePreviewOutcome = { result: SharePreviewResult } | { error: string; status: number }

/** Checks how a page looks when shared, within the visitor's hourly allowance. */
export async function previewForVisitor(url: string, ip: string): Promise<SharePreviewOutcome> {
	if (!url.trim()) return { error: 'Enter a page address to check.', status: 400 }
	// A separate allowance from audits: a preview is a handful of requests, not dozens.
	if (!takeRateLimit(`preview:${ip}`)) {
		return { error: "You've checked a lot of links. Try again in an hour.", status: 429 }
	}
	try {
		return { result: await withSlot(() => runSharePreview(url)) }
	} catch (e) {
		const message = e instanceof AuditError ? e.message : "We couldn't check that page."

		return { error: message, status: 422 }
	}
}
