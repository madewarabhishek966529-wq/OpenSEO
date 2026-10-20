import type { AuditContext } from '@server/audit/context'
import { containsTerm, topKeywords } from '@server/audit/keywords'
import { isAllowed } from '@server/audit/robots'
import { breadcrumbUrl, formatCount, formatNumber, formatPercent, truncate } from '@shared/format'
import type { CheckResult, Detail, Status } from '@shared/types'
import { inCategory, listDetail, tableDetail } from './check'

const check = inCategory('onpage')

function titleCheck(ctx: AuditContext): CheckResult {
	const { title, $ } = ctx
	const count = $('title').length
	const base = { id: 'title', title: 'Title tag', weight: 3, priority: 'high' as const }
	if (!title) {
		return check({
			...base,
			status: 'fail',
			summary: 'The page has no title.',
			recommendation:
				'Add a <title> of 50–60 characters that says what the page is about, with its main keyword near the start.'
		})
	}
	const details: Detail[] = [{ kind: 'code', text: title }]
	const length = title.length
	if (count > 1) {
		return check({
			...base,
			status: 'warn',
			summary: `The page has ${count} title tags.`,
			recommendation:
				'Keep a single <title> in the <head>; search engines may pick the wrong one.',
			details
		})
	}
	if (length < 30) {
		return check({
			...base,
			status: 'warn',
			summary: `The title is short: ${length} characters.`,
			recommendation:
				'Lengthen it to 50–60 characters. Short titles waste space in search results and give fewer reasons to click.',
			details
		})
	}
	if (length > 60) {
		return check({
			...base,
			status: 'warn',
			summary: `The title is ${length} characters, so Google will likely cut it off.`,
			recommendation: 'Keep it under 60 characters and put the most important words first.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The title is ${length} characters, a good length.`,
		details
	})
}

function descriptionCheck(ctx: AuditContext): CheckResult {
	const { description } = ctx
	const base = {
		id: 'meta-description',
		title: 'Meta description',
		weight: 3,
		priority: 'high' as const
	}
	if (!description) {
		return check({
			...base,
			status: 'fail',
			summary: 'The page has no meta description.',
			recommendation:
				'Add a meta description of 120–160 characters that sums up the page and gives people a reason to click.'
		})
	}
	const length = description.length
	const details: Detail[] = [{ kind: 'code', text: description }]
	if (length < 70) {
		return check({
			...base,
			status: 'warn',
			summary: `The meta description is short: ${length} characters.`,
			recommendation:
				'Aim for 120–160 characters so Google has enough to show under your title.',
			details
		})
	}
	if (length > 160) {
		return check({
			...base,
			status: 'warn',
			summary: `The meta description is ${length} characters, so it will be cut off.`,
			recommendation: 'Trim it to 160 characters or fewer, with the key message first.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The meta description is ${length} characters, a good length.`,
		details
	})
}

function serpPreview(ctx: AuditContext): CheckResult {
	return check({
		id: 'serp-preview',
		title: 'Search result preview',
		status: 'info',
		weight: 0,
		priority: 'low',
		summary: 'How the page could appear in Google search results.',
		details: [
			{
				kind: 'serp',
				title: truncate(ctx.title || ctx.finalUrl.hostname, 60),
				url: breadcrumbUrl(ctx.finalUrl.toString()),
				description: truncate(
					ctx.description || truncate(ctx.text, 160) || 'No description available.',
					160
				)
			}
		]
	})
}

function h1Check(ctx: AuditContext): CheckResult {
	const h1s = ctx
		.$('h1')
		.map((_, el) => ctx.$(el).text().replace(/\s+/g, ' ').trim())
		.get()
	const base = { id: 'h1', title: 'H1 heading', weight: 3, priority: 'high' as const }
	if (!h1s.length) {
		return check({
			...base,
			status: 'fail',
			summary: 'The page has no H1 heading.',
			recommendation:
				'Add one H1 that states the topic of the page. It is the strongest heading signal for search engines and screen readers.'
		})
	}
	const details = [listDetail(h1s.map((h) => h || '(empty)'))]
	if (h1s.length > 1) {
		return check({
			...base,
			status: 'warn',
			summary: `The page has ${h1s.length} H1 headings.`,
			recommendation:
				'Use a single H1 for the main topic and H2–H6 for the sections under it.',
			details
		})
	}
	if (!h1s[0]) {
		return check({
			...base,
			status: 'warn',
			summary: 'The H1 heading is empty.',
			recommendation: 'Put readable text in the H1, not only an image or icon.',
			details
		})
	}

	return check({ ...base, status: 'pass', summary: 'The page has one H1 heading.', details })
}

function headingsCheck(ctx: AuditContext): CheckResult {
	const { $ } = ctx
	const headings = $('h1, h2, h3, h4, h5, h6')
		.map((_, el) => ({
			level: Number(el.tagName.slice(1)),
			text: $(el).text().replace(/\s+/g, ' ').trim()
		}))
		.get()
	const counts = [2, 3, 4, 5, 6].map((level) => headings.filter((h) => h.level === level).length)
	let skipped = 0
	headings.reduce((previous, h) => {
		if (h.level > previous + 1) skipped++

		return h.level
	}, 1)
	const details: Detail[] = [
		tableDetail(['H2', 'H3', 'H4', 'H5', 'H6'], [counts]),
		listDetail(
			headings.map((h) => `H${h.level}  ${truncate(h.text || '(empty)', 90)}`),
			20
		)
	]
	const base = {
		id: 'headings',
		title: 'Heading structure',
		weight: 1.5,
		priority: 'medium' as const
	}
	if (!counts[0]) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page has no H2 headings.',
			recommendation:
				'Break the content into sections with H2 subheadings. They help readers scan and help search engines understand the topics covered.',
			details
		})
	}
	if (skipped) {
		return check({
			...base,
			status: 'warn',
			summary: `Heading levels are skipped ${formatCount(skipped, 'time')} (for example H2 straight to H4).`,
			recommendation:
				'Nest headings in order so the outline makes sense to screen readers and crawlers.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page uses ${formatCount(headings.length, 'heading')} in a clear order.`,
		details
	})
}

function contentCheck(ctx: AuditContext): CheckResult {
	const { wordCount, text, html } = ctx
	const ratio = formatPercent(Buffer.byteLength(text), Buffer.byteLength(html))
	const details: Detail[] = [
		{
			kind: 'metrics',
			items: [
				{ label: 'Words', value: formatNumber(wordCount) },
				{ label: 'Text to HTML', value: ratio }
			]
		}
	]
	const base = {
		id: 'content-length',
		title: 'Amount of content',
		weight: 2,
		priority: 'medium' as const
	}
	if (wordCount < 200) {
		return check({
			...base,
			status: 'fail',
			summary: `The page has only ${formatCount(wordCount, 'word')} of readable text.`,
			recommendation:
				'Pages with little text rarely rank. Explain the topic properly: aim for at least 500 words on pages you want found.',
			details
		})
	}
	if (wordCount < 500) {
		return check({
			...base,
			status: 'warn',
			summary: `The page has ${formatCount(wordCount, 'word')}, on the light side.`,
			recommendation:
				'Pages that rank well usually cover their topic in more depth. Consider adding detail, examples or answers to common questions.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page has ${formatCount(wordCount, 'word')} of readable text.`,
		details
	})
}

function keywordCheck(ctx: AuditContext): CheckResult {
	const { single, phrases } = topKeywords(ctx.text, 8)
	const headingText = ctx.$('h1, h2, h3').text()
	const base = {
		id: 'keywords',
		title: 'Keyword consistency',
		weight: 2,
		priority: 'medium' as const
	}
	if (!single.length) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary: 'There is not enough text to find the main keywords.'
		})
	}
	const top = [...phrases.slice(0, 3), ...single].slice(0, 8)
	const mark = (value: boolean) => (value ? '✓' : '–')
	const rows = top.map((k) => [
		k.term,
		k.count,
		mark(containsTerm(ctx.title, k.term)),
		mark(containsTerm(ctx.description, k.term)),
		mark(containsTerm(headingText, k.term))
	])
	const leading = top.slice(0, 5)
	const inMeta = leading.filter(
		(k) => containsTerm(ctx.title, k.term) || containsTerm(ctx.description, k.term)
	).length
	const details = [tableDetail(['Keyword', 'Uses', 'Title', 'Description', 'Headings'], rows)]
	if (inMeta >= 2) {
		return check({
			...base,
			status: 'pass',
			summary: `${inMeta} of the page's top ${leading.length} keywords appear in the title or meta description.`,
			details
		})
	}

	return check({
		...base,
		status: inMeta === 1 ? 'warn' : 'fail',
		summary:
			inMeta === 1
				? 'Only one of the most-used keywords appears in the title or meta description.'
				: "The words the page uses most don't appear in its title or meta description.",
		recommendation:
			'Decide which phrase this page should rank for, then use it in the title, meta description, H1 and body text.',
		details
	})
}

function imageAltCheck(ctx: AuditContext): CheckResult {
	const { images } = ctx
	const missing = images.filter((i) => i.alt === null)
	const base = {
		id: 'image-alt',
		title: 'Image alt text',
		weight: 2,
		priority: 'medium' as const
	}
	if (!images.length) {
		return check({ ...base, status: 'pass', summary: 'The page has no images to describe.' })
	}
	if (!missing.length) {
		return check({
			...base,
			status: 'pass',
			summary:
				images.length === 1
					? 'The image has an alt attribute.'
					: `All ${formatCount(images.length, 'image')} have alt attributes.`
		})
	}
	const share = missing.length / images.length

	return check({
		...base,
		status: share > 0.2 ? 'fail' : 'warn',
		summary: `${missing.length} of ${formatCount(images.length, 'image')} have no alt attribute.`,
		recommendation:
			'Describe each meaningful image in its alt attribute. Use alt="" for decorative images so screen readers skip them.',
		details: [listDetail(missing.map((i) => i.src))]
	})
}

function canonicalCheck(ctx: AuditContext): CheckResult {
	const links = ctx
		.$('link[rel="canonical" i]')
		.map((_, el) => ctx.$(el).attr('href') || '')
		.get()
	const base = {
		id: 'canonical',
		title: 'Canonical tag',
		weight: 1.5,
		priority: 'medium' as const
	}
	if (!links.length) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page has no canonical tag.',
			recommendation:
				'Add <link rel="canonical" href="…"> pointing at the preferred URL, so copies with tracking parameters or other paths don\'t split your rankings.'
		})
	}
	if (links.length > 1) {
		return check({
			...base,
			status: 'fail',
			summary: `The page has ${links.length} canonical tags.`,
			recommendation: 'Keep exactly one. Search engines ignore conflicting canonicals.',
			details: [listDetail(links)]
		})
	}
	let target: URL
	try {
		target = new URL(links[0], ctx.finalUrl)
	} catch {
		return check({
			...base,
			status: 'fail',
			summary: 'The canonical URL is not valid.',
			recommendation: 'Use a full, absolute URL in the canonical tag.',
			details: [{ kind: 'code', text: links[0] }]
		})
	}
	const normalize = (u: URL) =>
		`${u.host}${u.pathname.replace(/\/$/, '')}${u.search}`.toLowerCase()
	if (normalize(target) !== normalize(ctx.finalUrl)) {
		return check({
			...base,
			status: 'warn',
			summary: 'The canonical tag points to a different URL.',
			recommendation:
				"Search engines will index that URL instead of this one. That's right for duplicates; make sure it's intended.",
			details: [{ kind: 'code', text: target.toString() }]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'The page has a canonical tag pointing to itself.',
		details: [{ kind: 'code', text: target.toString() }]
	})
}

function indexabilityCheck(ctx: AuditContext): CheckResult {
	const metaRobots = ctx
		.$('meta[name="robots" i], meta[name="googlebot" i]')
		.map((_, el) => ctx.$(el).attr('content') || '')
		.get()
		.join(', ')
		.toLowerCase()
	const header = (ctx.page.headers.get('x-robots-tag') || '').toLowerCase()
	const base = {
		id: 'indexable',
		title: 'Search engines can index the page',
		weight: 3,
		priority: 'high' as const
	}
	const sources = [
		metaRobots && `Meta robots: ${metaRobots}`,
		header && `X-Robots-Tag: ${header}`
	].filter(Boolean) as string[]
	if (/noindex|none/.test(metaRobots) || /noindex|none/.test(header)) {
		return check({
			...base,
			status: 'fail',
			summary: 'The page tells search engines not to index it (noindex).',
			recommendation:
				'Remove noindex from the meta robots tag or X-Robots-Tag header if this page should appear in search results.',
			details: [listDetail(sources)]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'Nothing on the page stops search engines from indexing it.',
		details: sources.length ? [listDetail(sources)] : undefined
	})
}

function langCheck(ctx: AuditContext): CheckResult {
	const lang = ctx.$('html').attr('lang')?.trim()
	const base = { id: 'lang', title: 'Language', weight: 1, priority: 'low' as const }
	if (!lang) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page does not declare its language.',
			recommendation:
				'Add a lang attribute to the <html> tag, like <html lang="en">. It helps search engines serve the page to the right audience and screen readers pronounce it correctly.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page declares its language as "${lang}".`
	})
}

function hreflangCheck(ctx: AuditContext): CheckResult {
	const tags = ctx
		.$('link[rel="alternate" i][hreflang]')
		.map((_, el) => ({
			lang: ctx.$(el).attr('hreflang') || '',
			href: ctx.$(el).attr('href') || ''
		}))
		.get()
	const base = { id: 'hreflang', title: 'Hreflang tags', priority: 'low' as const }
	if (!tags.length) {
		return check({
			...base,
			status: 'info',
			weight: 0,
			summary:
				'No hreflang tags. You only need them if the site has versions in several languages or regions.'
		})
	}
	const invalid = tags.filter((t) => !/^([a-z]{2,3}(-[a-z0-9]{2,4})?|x-default)$/i.test(t.lang))
	const details = [
		tableDetail(
			['Language', 'URL'],
			tags.map((t) => [t.lang, t.href])
		)
	]
	if (invalid.length) {
		return check({
			...base,
			weight: 0.5,
			status: 'warn',
			summary: `${formatCount(invalid.length, 'hreflang tag')} use an invalid language code.`,
			recommendation:
				'Use ISO 639-1 language codes with optional ISO 3166 regions, like "en" or "en-GB".',
			details
		})
	}

	return check({
		...base,
		weight: 0.5,
		status: 'pass',
		summary: `The page lists ${formatCount(tags.length, 'language version')}.`,
		details
	})
}

function robotsCheck(ctx: AuditContext): CheckResult {
	const { robots, finalUrl } = ctx
	const base = { id: 'robots-txt', title: 'Robots.txt', weight: 2, priority: 'high' as const }
	if (!robots.found || !robots.parsed) {
		return check({
			...base,
			status: 'warn',
			summary: robots.status
				? `There is no robots.txt (the server answered ${robots.status}).`
				: 'There is no robots.txt.',
			recommendation:
				'Add a robots.txt at the root of the site. Even a simple one that allows everything and links to your sitemap helps crawlers.'
		})
	}
	const path = `${finalUrl.pathname}${finalUrl.search}`
	if (!isAllowed(robots.parsed, 'Googlebot', path)) {
		return check({
			...base,
			status: 'fail',
			summary: 'Robots.txt blocks Google from crawling this page.',
			recommendation:
				'Remove the Disallow rule that matches this URL, unless you really want it kept out of search.',
			details: [{ kind: 'code', text: robots.url }]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'The site has a robots.txt and it allows this page to be crawled.',
		details: [{ kind: 'code', text: robots.url }]
	})
}

function sitemapCheck(ctx: AuditContext): CheckResult {
	const { sitemap } = ctx
	const base = { id: 'sitemap', title: 'XML sitemap', weight: 1.5, priority: 'medium' as const }
	if (!sitemap.found || !sitemap.url) {
		return check({
			...base,
			status: 'warn',
			summary: "We couldn't find an XML sitemap.",
			recommendation:
				'Publish a sitemap.xml listing the pages you want indexed, reference it from robots.txt and submit it in Google Search Console.',
			details: [listDetail(sitemap.tried.map((url) => `Tried ${url}`))]
		})
	}
	const what = sitemap.isIndex ? 'a sitemap index with' : 'a sitemap with'

	return check({
		...base,
		status: 'pass',
		summary: `Found ${what} ${formatCount(sitemap.urlCount ?? 0, sitemap.isIndex ? 'sitemap' : 'URL')}, via ${sitemap.source}.`,
		details: [{ kind: 'code', text: sitemap.url }]
	})
}

function structuredDataCheck(ctx: AuditContext): CheckResult {
	const { jsonLd, microdataTypes } = ctx
	const types = [...new Set([...jsonLd.types, ...microdataTypes])]
	const base = {
		id: 'structured-data',
		title: 'Structured data',
		weight: 1.5,
		priority: 'medium' as const
	}
	if (jsonLd.errors) {
		return check({
			...base,
			status: 'warn',
			summary: `${formatCount(jsonLd.errors, 'JSON-LD block')} could not be parsed.`,
			recommendation:
				"Fix the JSON syntax and check the markup with Google's Rich Results Test.",
			details: types.length
				? [{ kind: 'tags', items: types.map((label) => ({ label })) }]
				: undefined
		})
	}
	if (!types.length) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page has no structured data.',
			recommendation:
				'Add schema.org markup as JSON-LD (Organization, Product, Article, FAQ…) to qualify for rich results and help search engines understand the page.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page describes itself with ${formatCount(types.length, 'schema.org type')}.`,
		details: [{ kind: 'tags', items: types.map((label) => ({ label })) }]
	})
}

function analyticsCheck(ctx: AuditContext): CheckResult {
	const tools = ctx.tech.filter((t) => t.category === 'Analytics' || t.category === 'Tag manager')
	const base = { id: 'analytics', title: 'Analytics', weight: 1, priority: 'low' as const }
	if (!tools.length) {
		return check({
			...base,
			status: 'warn',
			summary: "We didn't find an analytics tool.",
			recommendation:
				'Add analytics (Google Analytics, Plausible, Fathom, Umami…) so you can see which pages and searches bring visitors.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page uses ${tools.map((t) => t.name).join(', ')}.`
	})
}

function friendlyUrlCheck(ctx: AuditContext): CheckResult {
	const { finalUrl } = ctx
	const problems: string[] = []
	if (finalUrl.search && finalUrl.searchParams.size > 1)
		problems.push('it has several query parameters')
	if (/_/.test(finalUrl.pathname)) problems.push('it uses underscores instead of hyphens')
	if (/[A-Z]/.test(finalUrl.pathname)) problems.push('it has capital letters')
	if (finalUrl.toString().length > 100) problems.push('it is longer than 100 characters')
	if (finalUrl.pathname.split('/').filter(Boolean).length > 4)
		problems.push('it is nested more than four folders deep')
	const base = {
		id: 'friendly-url',
		title: 'Readable URL',
		weight: 0.5,
		priority: 'low' as const
	}
	if (problems.length) {
		return check({
			...base,
			status: 'warn',
			summary: `The URL is harder to read: ${problems.join(', ')}.`,
			recommendation: 'Use short, lowercase URLs with words separated by hyphens.',
			details: [{ kind: 'code', text: finalUrl.toString() }]
		})
	}

	return check({ ...base, status: 'pass', summary: 'The URL is short and readable.' })
}

function doctypeCheck(ctx: AuditContext): CheckResult {
	const hasDoctype = /^\s*(<!--[\s\S]*?-->\s*)*<!doctype html/i.test(ctx.html.replace(/^﻿/, ''))
	const hasCharset =
		ctx.$('meta[charset]').length > 0 ||
		ctx.$('meta[http-equiv="content-type" i]').length > 0 ||
		/charset=/i.test(ctx.page.contentType)
	const missing = [
		!hasDoctype && 'an HTML5 doctype',
		!hasCharset && 'a character encoding'
	].filter(Boolean)
	const base = {
		id: 'doctype',
		title: 'Doctype and encoding',
		weight: 0.5,
		priority: 'low' as const
	}
	if (missing.length) {
		return check({
			...base,
			status: 'warn',
			summary: `The page doesn't declare ${missing.join(' or ')}.`,
			recommendation:
				'Start the page with <!DOCTYPE html> and add <meta charset="utf-8"> in the <head>.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'The page declares an HTML5 doctype and its encoding.'
	})
}

function localCheck(ctx: AuditContext): CheckResult {
	const phones = ctx.$('a[href^="tel:" i]').length
	const raw = JSON.stringify(ctx.jsonLd.items)
	const hasAddress = /PostalAddress|streetAddress/.test(raw) || ctx.$('address').length > 0
	const hasLocalSchema = ctx.jsonLd.types.some((t) =>
		/LocalBusiness|Store|Restaurant|Dentist|Attorney|Hotel/.test(t)
	)

	return check({
		id: 'local',
		title: 'Local SEO signals',
		status: 'info',
		weight: 0,
		priority: 'low',
		summary: hasLocalSchema
			? 'The page has local business markup.'
			: 'Only matters for businesses with a physical location or service area.',
		details: [
			{
				kind: 'kv',
				items: [
					['Phone links', phones ? formatNumber(phones) : 'None'],
					['Address on page', hasAddress ? 'Yes' : 'No'],
					['LocalBusiness schema', hasLocalSchema ? 'Yes' : 'No']
				]
			}
		]
	})
}

function readabilityCheck(ctx: AuditContext): CheckResult {
	const text = ctx.text || ''
	const wordCount = ctx.wordCount || 0
	const base = { id: 'readability', title: 'Content readability', weight: 1, priority: 'medium' as const }

	if (wordCount < 50) {
		return check({
			...base,
			status: 'info',
			summary: 'Too little text to reliably calculate reading ease.',
			details: [{ kind: 'kv', items: [['Word count', formatNumber(wordCount)]] }]
		})
	}

	const sentences = Math.max(1, (text.match(/[.!?]+(\s+|$)/g) || []).length)
	const words = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || []
	let syllables = 0
	for (const w of words) {
		const matches = w.replace(/(?:[^laeiouy]|ed|es|e)$/, '').match(/[aeiouy]{1,2}/g)
		syllables += matches ? matches.length : 1
	}
	const safeSyllables = Math.max(words.length, syllables)
	const asl = words.length / sentences
	const asw = safeSyllables / Math.max(1, words.length)
	const rawScore = 206.835 - 1.015 * asl - 84.6 * asw
	const score = Math.max(0, Math.min(100, Math.round(rawScore)))
	const readMinutes = Math.max(1, Math.round(wordCount / 200))

	let level = 'Standard / Plain English'
	let status: Status = 'pass'
	if (score >= 90) level = 'Very Easy (5th grade level)'
	else if (score >= 70) level = 'Fairly Easy (7th-8th grade level)'
	else if (score >= 60) level = 'Standard / Plain English'
	else if (score >= 50) {
		level = 'Fairly Difficult (High school)'
		status = 'warn'
	} else if (score >= 30) {
		level = 'Difficult (College level)'
		status = 'warn'
	} else {
		level = 'Very Confusing (Graduate level)'
		status = 'fail'
	}

	const details: Detail[] = [
		{
			kind: 'kv',
			items: [
				['Flesch Reading Ease', `${score} / 100 (${level})`],
				['Est. reading time', `~${readMinutes} min`],
				['Word count', formatNumber(wordCount)],
				['Avg. words per sentence', Math.round(asl).toString()]
			]
		}
	]

	if (status === 'pass') {
		return check({
			...base,
			status: 'pass',
			summary: `Content has good readability (${score}/100, ${level}).`,
			details
		})
	}

	return check({
		...base,
		status,
		summary: `Content is difficult to read (${score}/100, ${level}).`,
		recommendation:
			'Use shorter sentences, simpler vocabulary, and clear headings to make the content easier to read and improve engagement.',
		details
	})
}

function richSchemaCheck(ctx: AuditContext): CheckResult {
	const base = { id: 'rich-schema', title: 'Rich results markup', weight: 1, priority: 'medium' as const }
	const types = ctx.jsonLd.types
	if (!types.length) {
		return check({
			...base,
			status: 'info',
			summary: 'No Schema.org structured data types detected.',
			recommendation:
				'Add JSON-LD markup (such as FAQPage, Article, or Product) to qualify for Google Rich Results in search.'
		})
	}

	const supportedRichTypes = ['FAQPage', 'Article', 'Product', 'Recipe', 'LocalBusiness', 'BreadcrumbList', 'Organization']
	const detected = types.filter((t) => supportedRichTypes.some((s) => t.toLowerCase().includes(s.toLowerCase())))

	if (!detected.length) {
		return check({
			...base,
			status: 'info',
			summary: `The page has structured data (${types.join(', ')}), but none matching primary Google Rich Results types.`,
			details: [{ kind: 'list', items: types }]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The page includes Rich Results structured data: ${detected.join(', ')}.`,
		details: [
			{
				kind: 'tags',
				items: detected.map((t) => ({ label: t, tone: 'pass' }))
			}
		]
	})
}

export function onPageChecks(ctx: AuditContext): CheckResult[] {
	return [
		titleCheck(ctx),
		descriptionCheck(ctx),
		serpPreview(ctx),
		h1Check(ctx),
		headingsCheck(ctx),
		contentCheck(ctx),
		readabilityCheck(ctx),
		keywordCheck(ctx),
		imageAltCheck(ctx),
		canonicalCheck(ctx),
		indexabilityCheck(ctx),
		robotsCheck(ctx),
		sitemapCheck(ctx),
		structuredDataCheck(ctx),
		richSchemaCheck(ctx),
		langCheck(ctx),
		hreflangCheck(ctx),
		analyticsCheck(ctx),
		friendlyUrlCheck(ctx),
		doctypeCheck(ctx),
		localCheck(ctx)
	]
}

