export interface RobotsGroup {
	agents: string[]
	rules: { allow: boolean; path: string }[]
}

export interface RobotsTxt {
	groups: RobotsGroup[]
	sitemaps: string[]
}

/** Parses robots.txt into groups of user agents and their allow/disallow rules. */
export function parseRobots(raw: string): RobotsTxt {
	const groups: RobotsGroup[] = []
	const sitemaps: string[] = []
	let current: RobotsGroup | null = null
	let lastWasAgent = false

	for (const line of raw.split(/\r?\n/)) {
		const clean = line.replace(/#.*$/, '').trim()
		const colon = clean.indexOf(':')
		if (!clean || colon === -1) continue
		const key = clean.slice(0, colon).trim().toLowerCase()
		const value = clean.slice(colon + 1).trim()

		if (key === 'user-agent') {
			if (!current || !lastWasAgent) {
				current = { agents: [], rules: [] }
				groups.push(current)
			}
			current.agents.push(value.toLowerCase())
			lastWasAgent = true
			continue
		}
		lastWasAgent = false
		if (key === 'sitemap') sitemaps.push(value)
		// An empty Disallow allows everything, so it adds no rule.
		else if ((key === 'allow' || key === 'disallow') && current && value) {
			current.rules.push({ allow: key === 'allow', path: value })
		}
	}

	return { groups, sitemaps }
}

function patternToRegex(path: string): RegExp {
	const anchored = path.endsWith('$')
	const body = (anchored ? path.slice(0, -1) : path)
		.split('*')
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
		.join('.*')

	return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

function matchesAgent(groupAgent: string, token: string): boolean {
	return groupAgent !== '*' && (token === groupAgent || token.startsWith(groupAgent))
}

/** The groups that apply to a crawler, falling back to the `*` group. */
export function groupsFor(robots: RobotsTxt, agent: string): RobotsGroup[] {
	const token = agent.toLowerCase()
	const specific = robots.groups.filter((g) => g.agents.some((a) => matchesAgent(a, token)))
	if (specific.length) return specific

	return robots.groups.filter((g) => g.agents.includes('*'))
}

/** Google's rule: the longest matching path wins, and Allow wins a tie. */
export function isAllowed(robots: RobotsTxt, agent: string, pathWithQuery: string): boolean {
	const rules = groupsFor(robots, agent).flatMap((g) => g.rules)
	let best: { allow: boolean; length: number } | null = null
	for (const rule of rules) {
		if (!patternToRegex(rule.path).test(pathWithQuery)) continue
		const length = rule.path.length
		if (!best || length > best.length || (length === best.length && rule.allow)) {
			best = { allow: rule.allow, length }
		}
	}

	return best ? best.allow : true
}

/** True when robots.txt has a group of its own for this crawler. */
export function mentionsAgent(robots: RobotsTxt, agent: string): boolean {
	const token = agent.toLowerCase()

	return robots.groups.some((g) => g.agents.some((a) => matchesAgent(a, token)))
}
