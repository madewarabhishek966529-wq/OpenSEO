import { appendFile, readFile } from 'node:fs/promises'

interface Comment {
	id: number
	body?: string
	html_url: string
	user?: { type?: string }
}

/** Sets the step's outputs. */
export async function setOutputs(
	outputs: Record<string, string | number | boolean>
): Promise<void> {
	const file = process.env.GITHUB_OUTPUT
	if (!file) return
	const lines = Object.entries(outputs).map(
		([key, value]) => `${key}=${String(value).replace(/\n/g, ' ')}\n`
	)
	await appendFile(file, lines.join(''))
}

/** Adds Markdown to the job summary on the workflow run's page. */
export async function writeSummary(markdown: string): Promise<void> {
	const file = process.env.GITHUB_STEP_SUMMARY
	if (file) await appendFile(file, `${markdown}\n`)
}

/** A workflow command that shows up as an annotation on the run, escaped as GitHub documents. */
export function annotation(level: 'error' | 'warning' | 'notice', message: string): string {
	const data = message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')

	return `::${level} title=OpenSEO::${data}`
}

async function github<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
	const base = process.env.GITHUB_API_URL || 'https://api.github.com'
	const res = await fetch(`${base}${path}`, {
		method,
		headers: {
			authorization: `Bearer ${token}`,
			accept: 'application/vnd.github+json',
			'x-github-api-version': '2022-11-28',
			'user-agent': 'OpenSEO',
			...(body === undefined ? {} : { 'content-type': 'application/json' })
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(15_000)
	})
	if (!res.ok) {
		const reason =
			res.status === 403 || res.status === 404
				? "the token can't write to pull requests. Give the job `permissions: pull-requests: write`."
				: `GitHub answered HTTP ${res.status}.`
		throw new Error(reason)
	}

	return (await res.json()) as T
}

/**
 * The pull request this run belongs to: the one that triggered it, or for a deploy (the
 * deployment_status event Vercel and Netlify send), the open pull request for its commit.
 */
export async function pullRequestNumber(token: string): Promise<number | null> {
	const path = process.env.GITHUB_EVENT_PATH
	const repo = process.env.GITHUB_REPOSITORY
	if (!path || !repo) return null
	const event = JSON.parse(await readFile(path, 'utf8')) as {
		pull_request?: { number: number }
		deployment?: { sha?: string }
	}
	if (event.pull_request?.number) return event.pull_request.number
	const sha = event.deployment?.sha
	if (!sha) return null
	const pulls = await github<{ number: number; state: string }[]>(
		token,
		'GET',
		`/repos/${repo}/commits/${sha}/pulls`
	)

	return pulls.find((p) => p.state === 'open')?.number ?? null
}

/** Posts the comment, or updates the one an earlier run posted. Returns its address. */
export async function upsertComment(
	token: string,
	number: number,
	marker: string,
	markdown: string
): Promise<string> {
	const repo = process.env.GITHUB_REPOSITORY
	const comments: Comment[] = []
	for (let page = 1; page <= 10; page++) {
		const batch = await github<Comment[]>(
			token,
			'GET',
			`/repos/${repo}/issues/${number}/comments?per_page=100&page=${page}`
		)
		comments.push(...batch)
		if (batch.length < 100) break
	}
	const body = `${marker}\n${markdown}`
	// Anyone can paste the marker into a comment, so it has to open a comment a bot (the action) wrote.
	const earlier = comments.find((c) => c.body?.startsWith(marker) && c.user?.type === 'Bot')
	const saved = earlier
		? await github<Comment>(token, 'PATCH', `/repos/${repo}/issues/comments/${earlier.id}`, {
				body
			})
		: await github<Comment>(token, 'POST', `/repos/${repo}/issues/${number}/comments`, { body })

	return saved.html_url
}
