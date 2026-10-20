import type { ReportComparison } from '@shared/compare'
import { formatCount } from '@shared/format'
import type { ChangeGroupInfo, GroupSpec } from './check-changes.types'

function sameSpecs(): GroupSpec[] {
	return [
		{
			id: 'new',
			kinds: ['new-problem'],
			title: 'New problems',
			description: 'Passed before, need work now.',
			tone: 'fail',
			open: true
		},
		{
			id: 'worse',
			kinds: ['worse'],
			title: 'Got worse',
			description: 'Needed work before, fail now.',
			tone: 'fail',
			open: true
		},
		{
			id: 'fixed',
			kinds: ['fixed'],
			title: 'Fixed',
			description: 'Needed work before, pass now.',
			tone: 'pass',
			open: true
		},
		{
			id: 'improved',
			kinds: ['improved'],
			title: 'Improved',
			description: 'Failed before, closer to passing now.',
			tone: 'warn',
			open: true
		},
		{
			id: 'still-failing',
			kinds: ['still-failing'],
			title: 'Still to fix',
			description: 'Need work in both audits.',
			tone: 'warn',
			open: false
		}
	]
}

function sideSpecs(comparison: ReportComparison): GroupSpec[] {
	const { a, b } = comparison

	return [
		{
			id: 'b-behind',
			kinds: ['new-problem', 'worse'],
			title: `Where ${b.label} is behind`,
			description: `Checks ${a.label} does better on.`,
			tone: 'info',
			open: true
		},
		{
			id: 'a-behind',
			kinds: ['fixed', 'improved'],
			title: `Where ${a.label} is behind`,
			description: `Checks ${b.label} does better on.`,
			tone: 'info',
			open: true
		},
		{
			id: 'still-failing',
			kinds: ['still-failing'],
			title: 'Both need work',
			description: 'Problems on both pages.',
			tone: 'warn',
			open: false
		}
	]
}

/**
 * The groups to list, in order, leaving out empty ones. The same page reads as a timeline (new
 * problems, fixed); two pages read as a contest (where each one is behind).
 */
export function groupsFor(comparison: ReportComparison): ChangeGroupInfo[] {
	const specs: GroupSpec[] = [
		...(comparison.samePage ? sameSpecs() : sideSpecs(comparison)),
		{
			id: 'one-sided',
			kinds: ['added', 'removed'],
			title: 'Only in one audit',
			description: 'Checks OpenSEO added or dropped between the two audits.',
			tone: 'info',
			open: false
		},
		{
			id: 'still-passing',
			kinds: ['still-passing'],
			title: comparison.samePage ? 'Still passing' : 'Both pass',
			description: comparison.samePage ? 'Passed both times.' : 'Fine on both pages.',
			tone: 'pass',
			open: false
		}
	]

	return specs
		.map(({ kinds, ...group }) => ({
			...group,
			checks: comparison.checks.filter((c) => kinds.includes(c.kind))
		}))
		.filter((group) => group.checks.length > 0)
}

/** "3 checks changed", "No check differs". */
export function changedLabel(count: number, samePage: boolean): string {
	if (!count) return samePage ? 'No check changed' : 'No check differs'
	const verb = samePage ? 'changed' : count === 1 ? 'differs' : 'differ'

	return `${formatCount(count, 'check')} ${verb}`
}
