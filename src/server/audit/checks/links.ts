import type { AuditContext } from '@server/audit/context'
import { formatCount, formatNumber } from '@shared/format'
import type { CheckResult, Detail } from '@shared/types'
import { inCategory, listDetail, tableDetail } from './check'

const check = inCategory('links')

/** Link text that tells a reader (or a search engine) nothing about where it goes. */
const GENERIC_TEXT = new Set([
	'click here',
	'here',
	'read more',
	'more',
	'learn more',
	'link',
	'this',
	'click',
	'go',
	'details',
	'continue'
])

function brokenLinksCheck(ctx: AuditContext): CheckResult {
	const { linkChecks, linksDiscovered } = ctx
	const broken = linkChecks.filter((l) => l.state === 'broken')
	const unverified = linkChecks.filter((l) => l.state === 'blocked' || l.state === 'unreachable')
	const base = { id: 'broken-links', title: 'Broken links', weight: 3, priority: 'high' as const }
	const scope =
		linkChecks.length < linksDiscovered
			? `${formatNumber(linkChecks.length)} of ${formatCount(linksDiscovered, 'link')}`
			: formatCount(linkChecks.length, 'link')
	const details: Detail[] = []
	if (broken.length) {
		details.push(
			tableDetail(
				['Link', 'Status', 'Type'],
				broken.map((l) => [
					l.url,
					l.status ?? 'No answer',
					l.internal ? 'Internal' : 'External'
				])
			)
		)
	}
	if (unverified.length) {
		details.push(
			listDetail(
				unverified.map(
					(l) => `${l.url} (${l.status ? `refused our check: ${l.status}` : 'no answer'})`
				),
				8
			)
		)
	}
	if (!linkChecks.length) {
		return check({ ...base, status: 'pass', summary: 'The page has no links to check.' })
	}
	if (!broken.length) {
		return check({
			...base,
			status: 'pass',
			summary: `We checked ${scope} and none are broken.`,
			details: details.length ? details : undefined
		})
	}
	const internalBroken = broken.some((l) => l.internal)

	return check({
		...base,
		status: internalBroken || broken.length >= 3 ? 'fail' : 'warn',
		summary: `${formatCount(broken.length, 'broken link')} out of ${scope} checked.`,
		recommendation:
			'Fix or remove broken links. They send visitors to dead ends and waste the crawl budget search engines give your site.',
		details
	})
}

function linkCountCheck(ctx: AuditContext): CheckResult {
	const { links } = ctx
	const internal = links.filter((l) => l.internal).length
	const external = links.length - internal
	const nofollow = links.filter((l) => l.nofollow).length
	const details: Detail[] = [
		{
			kind: 'metrics',
			items: [
				{ label: 'Internal', value: formatNumber(internal) },
				{ label: 'External', value: formatNumber(external) },
				{ label: 'Nofollow', value: formatNumber(nofollow) }
			]
		}
	]
	const base = {
		id: 'link-count',
		title: 'Links on the page',
		weight: 1,
		priority: 'medium' as const
	}
	if (!internal) {
		return check({
			...base,
			status: 'warn',
			summary: "The page doesn't link to any other page on the site.",
			recommendation:
				'Link to related pages. Internal links help visitors keep going and help search engines find and rank the rest of the site.',
			details
		})
	}
	if (links.length > 300) {
		return check({
			...base,
			status: 'warn',
			summary: `The page has ${formatCount(links.length, 'link')}, which is a lot.`,
			recommendation:
				'Very long link lists dilute the value each link passes on. Keep navigation focused and link to what matters most.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page has ${formatCount(internal, 'internal link')} and ${formatCount(external, 'external link')}.`,
		details
	})
}

function anchorTextCheck(ctx: AuditContext): CheckResult {
	const empty = ctx.links.filter((l) => !l.label)
	const generic = ctx.links.filter((l) => GENERIC_TEXT.has(l.text.toLowerCase()))
	const base = { id: 'anchor-text', title: 'Link text', weight: 1, priority: 'medium' as const }
	if (!empty.length && generic.length <= 2) {
		return check({
			...base,
			status: 'pass',
			summary: 'Links have descriptive text.'
		})
	}
	const parts = [
		empty.length && `${formatCount(empty.length, 'link')} with no text or label`,
		generic.length > 2 &&
			`${formatCount(generic.length, 'link')} with generic text like "read more"`
	].filter(Boolean)

	return check({
		...base,
		status: 'warn',
		summary: `The page has ${parts.join(' and ')}.`,
		recommendation:
			'Use link text that says where the link goes. For icon or image links, add an aria-label or alt text.',
		details: [
			listDetail([
				...empty.map((l) => `No text: ${l.href}`),
				...generic.map((l) => `"${l.text}": ${l.href}`)
			])
		]
	})
}

function internalNofollowCheck(ctx: AuditContext): CheckResult {
	const nofollowed = ctx.links.filter((l) => l.internal && l.nofollow)
	const base = {
		id: 'internal-nofollow',
		title: 'Nofollow on internal links',
		weight: 0.5,
		priority: 'low' as const
	}
	if (!nofollowed.length) {
		return check({ ...base, status: 'pass', summary: 'No internal links are marked nofollow.' })
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(nofollowed.length, 'internal link')} ${nofollowed.length === 1 ? 'is' : 'are'} marked nofollow.`,
		recommendation:
			'Remove rel="nofollow" from links to your own pages; it stops them passing value and doesn\'t hide them.',
		details: [listDetail(nofollowed.map((l) => l.href))]
	})
}

export function linkChecks(ctx: AuditContext): CheckResult[] {
	return [
		brokenLinksCheck(ctx),
		linkCountCheck(ctx),
		anchorTextCheck(ctx),
		internalNofollowCheck(ctx)
	]
}
