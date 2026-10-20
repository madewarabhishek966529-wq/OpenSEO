import type { AuditContext } from '@server/audit/context'
import { formatBytes, formatCount } from '@shared/format'
import type { CheckResult, Detail, IconAsset } from '@shared/types'
import { inCategory, listDetail, tableDetail } from './check'

const check = inCategory('usability')

const DEPRECATED_TAGS = [
	'acronym',
	'applet',
	'basefont',
	'big',
	'blink',
	'center',
	'dir',
	'font',
	'frame',
	'frameset',
	'marquee',
	'strike',
	'tt'
]

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

function viewportCheck(ctx: AuditContext): CheckResult {
	const content = (ctx.$('meta[name="viewport" i]').attr('content') || '').toLowerCase()
	const base = { id: 'viewport', title: 'Mobile viewport', weight: 3, priority: 'high' as const }
	if (!content) {
		return check({
			...base,
			status: 'fail',
			summary: 'The page has no viewport tag, so phones show it zoomed out.',
			recommendation:
				'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>. Google ranks with the mobile version of your page.'
		})
	}
	const details: Detail[] = [{ kind: 'code', text: content }]
	if (!content.includes('width=device-width')) {
		return check({
			...base,
			status: 'warn',
			summary: "The viewport tag doesn't use the device width.",
			recommendation: 'Use width=device-width so the layout fits the screen.',
			details
		})
	}
	const maxScale = Number(content.match(/maximum-scale\s*=\s*([\d.]+)/)?.[1] ?? 10)
	if (/user-scalable\s*=\s*(no|0)/.test(content) || maxScale < 2) {
		return check({
			...base,
			status: 'warn',
			summary: 'The viewport stops people from zooming in.',
			recommendation:
				'Remove user-scalable=no and low maximum-scale values. People with low vision need to zoom.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: 'The page is set up for mobile screens.',
		details
	})
}

function iconSize(icon: IconAsset): string {
	if (icon.format === 'svg') return 'Any (SVG)'
	if (icon.sizes && icon.sizes.length > 1) return icon.sizes.join(', ')

	return icon.width && icon.height ? `${icon.width}×${icon.height}` : 'Unknown'
}

function iconTable(icons: IconAsset[]): Detail {
	return tableDetail(
		['Icon', 'Found in', 'Size', 'Format', 'Status'],
		icons.map((icon) => [
			icon.url,
			icon.source,
			iconSize(icon),
			icon.format?.toUpperCase() ?? '–',
			icon.ok ? (icon.bytes ? formatBytes(icon.bytes) : 'Loads') : (icon.error ?? 'Broken')
		])
	)
}

/** The biggest square edge an icon offers, in pixels. SVGs scale, so they count as large. */
function edge(icon: IconAsset): number {
	if (icon.format === 'svg') return 512

	return Math.min(icon.width ?? 0, icon.height ?? 0)
}

function faviconCheck(ctx: AuditContext): CheckResult {
	const base = { id: 'favicon', title: 'Favicon', weight: 1, priority: 'low' as const }
	const favicons = ctx.sharing.icons.filter((icon) => icon.kind === 'favicon')
	const working = favicons.filter((icon) => icon.ok)
	const broken = favicons.filter((icon) => !icon.ok)
	const details = ctx.sharing.icons.length ? [iconTable(ctx.sharing.icons)] : undefined
	if (!working.length) {
		return check({
			...base,
			status: 'warn',
			summary: broken.length
				? "The site's favicon doesn't load."
				: 'The site has no favicon.',
			recommendation:
				'Add <link rel="icon" href="/favicon.svg"> (or a 48×48 PNG). Google shows it next to your result, and it helps people find your tab.',
			details
		})
	}
	if (broken.length) {
		return check({
			...base,
			status: 'warn',
			summary: `${formatCount(broken.length, 'declared favicon')} ${broken.length === 1 ? "doesn't" : "don't"} load.`,
			recommendation: 'Fix or remove the broken <link rel="icon"> tags.',
			details
		})
	}
	const largest = Math.max(...working.map(edge))
	if (largest < 48) {
		return check({
			...base,
			status: 'warn',
			summary: `The largest favicon is ${largest}×${largest}; Google asks for at least 48×48.`,
			recommendation:
				'Add a 48×48 (or larger) PNG or an SVG icon so it stays sharp in search results and on high-resolution screens.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary:
			largest >= 512
				? 'The site has a favicon that scales to any size.'
				: `The site has a favicon up to ${largest}×${largest}.`,
		details
	})
}

function appleTouchIconCheck(ctx: AuditContext): CheckResult {
	const base = {
		id: 'apple-touch-icon',
		title: 'Apple touch icon',
		weight: 0.5,
		priority: 'low' as const
	}
	const icons = ctx.sharing.icons.filter((icon) => icon.kind === 'apple-touch-icon')
	const icon = icons.find((i) => i.ok)
	const details = icons.length ? [iconTable(icons)] : undefined
	if (!icon) {
		return check({
			...base,
			status: 'warn',
			summary: icons.length
				? "The apple-touch-icon doesn't load."
				: 'The site has no apple-touch-icon.',
			recommendation:
				'Add <link rel="apple-touch-icon" href="/apple-touch-icon.png"> with a 180×180 PNG. iPhones use it for home screen shortcuts and iMessage shows it next to shared links.',
			details
		})
	}
	if (edge(icon) < 180 || icon.format !== 'png') {
		return check({
			...base,
			status: 'warn',
			summary:
				`The apple-touch-icon is ${iconSize(icon)} ${icon.format?.toUpperCase() ?? ''}`.trim() +
				'.',
			recommendation: 'Use a 180×180 PNG with a solid background; iOS ignores transparency.',
			details
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The site has a ${iconSize(icon)} apple-touch-icon.`,
		details
	})
}

function webManifestCheck(ctx: AuditContext): CheckResult {
	const { manifest, icons } = ctx.sharing
	const base = {
		id: 'web-manifest',
		title: 'Web app manifest',
		weight: 0.5,
		priority: 'low' as const
	}
	if (!manifest) {
		return check({
			...base,
			weight: 0,
			status: 'info',
			summary: "The site doesn't link a web app manifest.",
			recommendation:
				'Optional: a manifest.webmanifest with a name and 192×192 and 512×512 icons lets Android show your icon when people add the site to their home screen.'
		})
	}
	const facts: Detail = {
		kind: 'kv',
		items: [
			['URL', manifest.url],
			['Name', manifest.name ?? 'Missing'],
			['Short name', manifest.shortName ?? 'Missing'],
			['Theme color', manifest.themeColor ?? 'Missing'],
			['Background color', manifest.backgroundColor ?? 'Missing'],
			['Display', manifest.display ?? 'Missing'],
			['Icon sizes', manifest.iconSizes.join(', ') || 'None']
		]
	}
	if (!manifest.ok) {
		return check({
			...base,
			status: 'warn',
			summary: `The web app manifest doesn't load (${manifest.error ?? 'unknown error'}).`,
			recommendation: 'Fix the <link rel="manifest"> URL or remove the tag.',
			details: [facts]
		})
	}
	const sized = new Set(manifest.iconSizes)
	const anyIcon = icons.some(
		(icon) => icon.kind === 'manifest' && icon.format === 'svg' && icon.ok
	)
	const missing = [
		!manifest.name && !manifest.shortName && 'a name',
		!anyIcon && !sized.has('192x192') && 'a 192×192 icon',
		!anyIcon && !sized.has('512x512') && 'a 512×512 icon'
	].filter(Boolean)
	const brokenIcons = icons.filter((icon) => icon.kind === 'manifest' && !icon.ok)
	if (missing.length || brokenIcons.length) {
		return check({
			...base,
			status: 'warn',
			summary: [
				missing.length && `The manifest is missing ${missing.join(', ')}.`,
				brokenIcons.length &&
					`${formatCount(brokenIcons.length, 'manifest icon')} ${brokenIcons.length === 1 ? "doesn't" : "don't"} load.`
			]
				.filter(Boolean)
				.join(' '),
			recommendation:
				'Give the manifest a name and short_name, and icons at 192×192 and 512×512 so Android can install the site with a sharp icon.',
			details: [facts]
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The site has a web app manifest${manifest.name ? ` for "${manifest.name}"` : ''}.`,
		details: [facts]
	})
}

function themeColorCheck(ctx: AuditContext): CheckResult {
	const color = ctx.sharing.themeColor ?? ctx.sharing.manifest?.themeColor
	const base = { id: 'theme-color', title: 'Theme color', weight: 0.5, priority: 'low' as const }
	if (!color) {
		return check({
			...base,
			status: 'warn',
			summary: 'The page has no theme-color.',
			recommendation:
				'Add <meta name="theme-color" content="#…"> in your brand color. Mobile browsers tint their toolbar with it and Discord uses it for link embeds.'
		})
	}

	return check({
		...base,
		status: 'pass',
		summary: `The theme color is ${color}.`,
		details: [{ kind: 'tags', items: [{ label: color }] }]
	})
}

function iframeCheck(ctx: AuditContext): CheckResult {
	const sources = ctx
		.$('iframe')
		.map((_, el) => ctx.$(el).attr('src') || '(no src)')
		.get()
	const base = { id: 'iframes', title: 'Iframes', weight: 0.5, priority: 'low' as const }
	if (sources.length <= 3) {
		return check({
			...base,
			status: 'pass',
			summary: sources.length
				? `The page embeds ${formatCount(sources.length, 'iframe')}.`
				: "The page doesn't use iframes.",
			details: sources.length ? [listDetail(sources)] : undefined
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `The page embeds ${formatCount(sources.length, 'iframe')}.`,
		recommendation:
			"Content inside iframes isn't counted as part of your page, and each one slows loading. Keep only the embeds you need.",
		details: [listDetail(sources)]
	})
}

function pluginsCheck(ctx: AuditContext): CheckResult {
	const plugins = ctx.$(
		'object[type*="flash" i], embed[type*="flash" i], embed[src$=".swf" i], object[data$=".swf" i], applet'
	).length
	const base = { id: 'plugins', title: 'Legacy plugins', weight: 1, priority: 'low' as const }
	if (plugins) {
		return check({
			...base,
			status: 'fail',
			summary: `The page uses ${formatCount(plugins, 'Flash or Java element')}, which no browser runs any more.`,
			recommendation: 'Replace them with HTML, CSS and JavaScript.'
		})
	}

	return check({ ...base, status: 'pass', summary: "The page doesn't rely on Flash or Java." })
}

function emailCheck(ctx: AuditContext): CheckResult {
	const emails = new Set(
		[...ctx.mailtoLinks, ...(ctx.text.match(EMAIL) || [])].map((e) => e.toLowerCase())
	)
	const base = {
		id: 'email-privacy',
		title: 'Email addresses',
		weight: 0.5,
		priority: 'low' as const
	}
	if (!emails.size) {
		return check({
			...base,
			status: 'pass',
			summary: 'No email addresses are exposed in plain text.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(emails.size, 'email address', 'email addresses')} ${emails.size === 1 ? 'is' : 'are'} visible to spam bots.`,
		recommendation: 'Use a contact form, or obfuscate addresses, to cut down on spam.',
		details: [listDetail([...emails])]
	})
}

function deprecatedCheck(ctx: AuditContext): CheckResult {
	const found = DEPRECATED_TAGS.map((tag) => [tag, ctx.$(tag).length] as const).filter(
		([, n]) => n
	)
	const base = {
		id: 'deprecated-html',
		title: 'Deprecated HTML',
		weight: 0.5,
		priority: 'low' as const
	}
	if (!found.length) {
		return check({
			...base,
			status: 'pass',
			summary: "The page doesn't use deprecated HTML tags."
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `The page uses deprecated tags: ${found.map(([tag]) => `<${tag}>`).join(', ')}.`,
		recommendation:
			'Replace them with modern HTML and CSS. Browsers may drop support for them.',
		details: [listDetail(found.map(([tag, n]) => `<${tag}> × ${n}`))]
	})
}

function inlineStyleCheck(ctx: AuditContext): CheckResult {
	const count = ctx.$('body [style]').length
	const base = {
		id: 'inline-styles',
		title: 'Inline styles',
		weight: 0.5,
		priority: 'low' as const
	}
	if (count <= 50) {
		return check({
			...base,
			status: 'pass',
			summary: count
				? `Only ${formatCount(count, 'element')} use inline styles.`
				: "The page doesn't use inline styles."
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(count, 'element')} use inline styles.`,
		recommendation:
			'Move styling into stylesheets. Inline styles bloat the HTML and are harder to keep consistent.'
	})
}

function smallFontCheck(ctx: AuditContext): CheckResult {
	let small = 0
	ctx.$('body [style*="font-size" i]').each((_, el) => {
		const size = (ctx.$(el).attr('style') || '').match(/font-size\s*:\s*([\d.]+)\s*px/i)
		if (size && Number(size[1]) < 12) small++
	})
	const base = {
		id: 'font-size',
		title: 'Legible font sizes',
		weight: 0.5,
		priority: 'low' as const
	}
	if (!small) {
		return check({
			...base,
			status: 'pass',
			summary: 'No text is set smaller than 12px inline.'
		})
	}

	return check({
		...base,
		status: 'warn',
		summary: `${formatCount(small, 'element')} set text smaller than 12px.`,
		recommendation:
			'Use at least 12px (ideally 16px for body text) so the page is readable on phones.'
	})
}

function labelsCheck(ctx: AuditContext): CheckResult {
	const { $ } = ctx
	const hasName = (el: Parameters<typeof $>[0]): boolean => {
		const $el = $(el)
		const id = $el.attr('id')

		return Boolean(
			$el.attr('aria-label')?.trim() ||
			$el.attr('aria-labelledby') ||
			$el.attr('title')?.trim() ||
			$el.closest('label').length ||
			(id && $(`label[for="${id.replace(/"/g, '\\"')}"]`).length)
		)
	}
	let fields = 0
	let unlabeled = 0
	$('input, select, textarea').each((_, el) => {
		const type = ($(el).attr('type') || 'text').toLowerCase()
		if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return
		fields++
		if (!hasName(el)) unlabeled++
	})
	let unnamedButtons = 0
	$('button').each((_, el) => {
		if (!$(el).text().trim() && !hasName(el) && !$(el).find('img[alt]').length) unnamedButtons++
	})
	const base = {
		id: 'labels',
		title: 'Labels on forms and buttons',
		weight: 1,
		priority: 'medium' as const
	}
	if (!unlabeled && !unnamedButtons) {
		return check({
			...base,
			status: 'pass',
			summary: fields
				? 'Form fields and buttons all have labels.'
				: 'Buttons have readable names.'
		})
	}
	const parts = [
		unlabeled && `${formatCount(unlabeled, 'form field')} without a label`,
		unnamedButtons && `${formatCount(unnamedButtons, 'button')} without a name`
	].filter(Boolean)

	return check({
		...base,
		status: 'warn',
		summary: `The page has ${parts.join(' and ')}.`,
		recommendation:
			'Give every field a <label> and every icon button an aria-label, so screen readers can announce them.'
	})
}

function renderingCheck(ctx: AuditContext): CheckResult | null {
	const shots = [ctx.pagespeed?.mobile, ctx.pagespeed?.desktop]
		.filter((r) => r?.screenshot)
		.map((r) => ({
			label: r!.strategy === 'mobile' ? 'Phone' : 'Desktop',
			src: r!.screenshot!
		}))
	if (!shots.length) return null

	return check({
		id: 'rendering',
		title: 'How the page renders',
		status: 'info',
		weight: 0,
		priority: 'low',
		summary: 'Screenshots from Google PageSpeed Insights.',
		details: [{ kind: 'screenshots', items: shots }]
	})
}

function accessibilityScoreCheck(ctx: AuditContext): CheckResult | null {
	const score = ctx.pagespeed?.mobile?.accessibility
	if (score == null) return null
	const base = {
		id: 'accessibility-score',
		title: 'Accessibility score',
		weight: 1.5,
		priority: 'medium' as const
	}
	if (score >= 90) {
		return check({
			...base,
			status: 'pass',
			summary: `Lighthouse scores the page's accessibility ${score}/100.`
		})
	}

	return check({
		...base,
		status: score >= 50 ? 'warn' : 'fail',
		summary: `Lighthouse scores the page's accessibility ${score}/100.`,
		recommendation:
			'Run Lighthouse in Chrome DevTools for the full list. Common fixes: color contrast, alt text, labels and heading order.'
	})
}

export function usabilityChecks(ctx: AuditContext): CheckResult[] {
	return [
		viewportCheck(ctx),
		renderingCheck(ctx),
		accessibilityScoreCheck(ctx),
		labelsCheck(ctx),
		faviconCheck(ctx),
		appleTouchIconCheck(ctx),
		webManifestCheck(ctx),
		themeColorCheck(ctx),
		smallFontCheck(ctx),
		iframeCheck(ctx),
		pluginsCheck(ctx),
		emailCheck(ctx),
		deprecatedCheck(ctx),
		inlineStyleCheck(ctx)
	].filter((c): c is CheckResult => c !== null)
}
