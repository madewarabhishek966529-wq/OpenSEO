import type { AuditContext } from '@server/audit/context'
import { isAllowed, mentionsAgent } from '@server/audit/robots'
import { formatCount } from '@shared/format'
import type { CheckResult } from '@shared/types'
import { inCategory, tableDetail } from './check'

const check = inCategory('ai')

interface AiCrawler {
	agent: string
	company: string
	/** Search and assistant crawlers fetch pages to answer people; training crawlers build models. */
	purpose: 'search' | 'training'
}

const AI_CRAWLERS: AiCrawler[] = [
	{ agent: 'OAI-SearchBot', company: 'OpenAI', purpose: 'search' },
	{ agent: 'ChatGPT-User', company: 'OpenAI', purpose: 'search' },
	{ agent: 'Claude-SearchBot', company: 'Anthropic', purpose: 'search' },
	{ agent: 'Claude-User', company: 'Anthropic', purpose: 'search' },
	{ agent: 'PerplexityBot', company: 'Perplexity', purpose: 'search' },
	{ agent: 'Perplexity-User', company: 'Perplexity', purpose: 'search' },
	{ agent: 'GPTBot', company: 'OpenAI', purpose: 'training' },
	{ agent: 'ClaudeBot', company: 'Anthropic', purpose: 'training' },
	{ agent: 'Google-Extended', company: 'Google', purpose: 'training' },
	{ agent: 'Applebot-Extended', company: 'Apple', purpose: 'training' },
	{ agent: 'CCBot', company: 'Common Crawl', purpose: 'training' },
	{ agent: 'meta-externalagent', company: 'Meta', purpose: 'training' },
	{ agent: 'Bytespider', company: 'ByteDance', purpose: 'training' }
]

const APP_ROOTS = '#root, #__next, #app, #__nuxt, [ng-app], [data-reactroot]'

function crawlersCheck(ctx: AuditContext): CheckResult {
	const { robots, finalUrl } = ctx
	const base = {
		id: 'ai-crawlers',
		title: 'AI crawler access',
		weight: 2,
		priority: 'medium' as const
	}
	if (!robots.parsed) {
		return check({
			...base,
			status: 'pass',
			summary: 'Without a robots.txt, AI search and training crawlers may all read the site.'
		})
	}
	const path = `${finalUrl.pathname}${finalUrl.search}`
	const results = AI_CRAWLERS.map((c) => ({
		...c,
		allowed: isAllowed(robots.parsed!, c.agent, path),
		explicit: mentionsAgent(robots.parsed!, c.agent)
	}))
	const details = [
		tableDetail(
			['Crawler', 'Company', 'Used for', 'Allowed'],
			results.map((r) => [
				r.agent,
				r.company,
				r.purpose === 'search' ? 'AI search and answers' : 'Model training',
				`${r.allowed ? 'Yes' : 'No'}${r.explicit ? '' : ' (default rules)'}`
			]),
			20
		)
	]
	const blockedSearch = results.filter((r) => r.purpose === 'search' && !r.allowed)
	const blockedTraining = results.filter((r) => r.purpose === 'training' && !r.allowed)
	if (blockedSearch.length) {
		return check({
			...base,
			status: 'warn',
			summary: `Robots.txt blocks ${formatCount(blockedSearch.length, 'AI search crawler')} (${blockedSearch.map((r) => r.agent).join(', ')}).`,
			recommendation:
				'Blocking search crawlers keeps the page out of answers in ChatGPT, Claude and Perplexity. You can block training crawlers and still allow these.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: blockedTraining.length
			? `AI search crawlers can read the page; ${formatCount(blockedTraining.length, 'training crawler')} ${blockedTraining.length === 1 ? 'is' : 'are'} blocked.`
			: 'AI search and training crawlers can all read the page.',
		details
	})
}

function llmsTxtCheck(ctx: AuditContext): CheckResult {
	const base = { id: 'llms-txt', title: 'llms.txt', weight: 1, priority: 'low' as const }
	if (!ctx.llmsTxt.found) {
		return check({
			...base,
			status: 'warn',
			summary: 'The site has no llms.txt.',
			recommendation:
				'Consider adding /llms.txt: a short Markdown guide to your most important pages for AI tools. It is an emerging convention, not a ranking factor.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'The site publishes an llms.txt for AI tools.',
		details: [{ kind: 'code', text: ctx.llmsTxt.url }]
	})
}

function contentInHtmlCheck(ctx: AuditContext): CheckResult {
	const { wordCount, $ } = ctx
	const scripts = $('script[src]').length
	const isAppShell = $(APP_ROOTS).length > 0 || scripts >= 3
	const base = {
		id: 'content-in-html',
		title: 'Content without JavaScript',
		weight: 2,
		priority: 'high' as const
	}
	if (wordCount >= 200) {
		return check({
			...base,
			status: 'pass',
			summary: `The HTML already contains the content (${formatCount(wordCount, 'word')}), so any crawler can read it.`
		})
	}
	if (wordCount < 50 && isAppShell) {
		return check({
			...base,
			status: 'fail',
			summary:
				'The page seems to build its content with JavaScript; the HTML has almost no text.',
			recommendation:
				"Most AI crawlers don't run JavaScript. Render the page on the server (SSR or static generation) so the text is in the HTML."
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `The HTML has only ${formatCount(wordCount, 'word')} of text.`,
		recommendation:
			'Make sure the important text is in the HTML the server sends, not added later by JavaScript.'
	})
}

function semanticCheck(ctx: AuditContext): CheckResult {
	const { $ } = ctx
	const landmarks = ['main', 'article', 'header', 'nav', 'footer'].filter((tag) => $(tag).length)
	const base = {
		id: 'semantic-html',
		title: 'Semantic HTML',
		weight: 1,
		priority: 'low' as const
	}
	if (landmarks.includes('main') && landmarks.length >= 3) {
		return check({
			...base,
			status: 'pass',
			summary: `The page marks up its structure with ${landmarks.map((t) => `<${t}>`).join(', ')}.`
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: landmarks.length
			? `The page only uses ${landmarks.map((t) => `<${t}>`).join(', ')}.`
			: 'The page uses no structural elements like <main>, <header> or <footer>.',
		recommendation:
			'Wrap the main content in <main> (or <article>) and use <header>, <nav> and <footer>, so machines can tell content from chrome.'
	})
}

function entityCheck(ctx: AuditContext): CheckResult {
	const types = ctx.jsonLd.types
	const entities = types.filter((t) => /Organization|Person|LocalBusiness|Corporation/.test(t))
	const hasSameAs = /"sameAs"/.test(JSON.stringify(ctx.jsonLd.items))
	const base = {
		id: 'entity-schema',
		title: 'Who is behind the site',
		weight: 1,
		priority: 'medium' as const
	}
	if (!entities.length) {
		return check({
			...base,
			status: 'warn',
			summary: "Structured data doesn't say which organization or person publishes the site.",
			recommendation:
				'Add Organization (or Person) JSON-LD with your name, logo, URL and sameAs links to your profiles. AI answers lean on clear entities.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page identifies its publisher (${entities.join(', ')})${hasSameAs ? ' with sameAs links' : ''}.`
	})
}

function freshnessCheck(ctx: AuditContext): CheckResult {
	const { $ } = ctx
	const raw = JSON.stringify(ctx.jsonLd.items)
	const signals = [
		($('meta[property="article:modified_time"]').length || /"dateModified"/.test(raw)) &&
			'Modified date',
		($('meta[property="article:published_time"]').length || /"datePublished"/.test(raw)) &&
			'Published date',
		$('time[datetime]').length && '<time> elements',
		ctx.page.headers.get('last-modified') && 'Last-Modified header'
	].filter(Boolean) as string[]
	const base = { id: 'freshness', title: 'Dates', weight: 0.5, priority: 'low' as const }
	if (!signals.length) {
		return check({
			...base,
			status: 'warn',
			summary: "The page doesn't say when it was published or updated.",
			recommendation:
				'Show and mark up publish and update dates (datePublished, dateModified). Answer engines prefer content they can tell is current.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page carries dates: ${signals.join(', ')}.`
	})
}

function snippetCheck(ctx: AuditContext): CheckResult {
	const robotsMeta = ctx
		.$('meta[name="robots" i], meta[name="googlebot" i]')
		.map((_, el) => ctx.$(el).attr('content') || '')
		.get()
		.join(',')
		.toLowerCase()
	const header = (ctx.page.headers.get('x-robots-tag') || '').toLowerCase()
	const limited = /nosnippet|max-snippet\s*:\s*0/.test(`${robotsMeta},${header}`)
	const hidden = ctx.$('[data-nosnippet]').length
	const base = {
		id: 'snippets',
		title: 'Snippet controls',
		weight: 1,
		priority: 'medium' as const
	}
	if (limited) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page forbids search engines from quoting it (nosnippet).',
			recommendation:
				'nosnippet also keeps the page out of AI Overviews and similar answers. Remove it unless that is what you want.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: hidden
			? `Search engines may quote the page, except ${formatCount(hidden, 'section')} marked data-nosnippet.`
			: 'Search engines and AI answers may quote the page.'
	})
}

export function aiChecks(ctx: AuditContext): CheckResult[] {
	return [
		crawlersCheck(ctx),
		contentInHtmlCheck(ctx),
		entityCheck(ctx),
		snippetCheck(ctx),
		semanticCheck(ctx),
		llmsTxtCheck(ctx),
		freshnessCheck(ctx)
	]
}
