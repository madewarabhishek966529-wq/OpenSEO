import * as cheerio from 'cheerio'
import { describe, expect, it } from 'vitest'
import { imageSize } from '@server/audit/image-size'
import { bestFavicon, buildPreviews } from '@server/audit/previews'
import { readSocialMeta } from '@server/audit/social-meta'
import type { IconAsset, ImageAsset, SharePlatform } from '@shared/types'

const BASE = new URL('https://www.shop.example.com/bags/')

function png(width: number, height: number): Buffer {
	const buf = Buffer.alloc(33)
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf)
	buf.writeUInt32BE(13, 8)
	buf.write('IHDR', 12, 'latin1')
	buf.writeUInt32BE(width, 16)
	buf.writeUInt32BE(height, 20)

	return buf
}

function jpeg(width: number, height: number): Buffer {
	const app0 = [0xff, 0xe0, 0x00, 0x10, ...Array(14).fill(0)]
	const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff]

	return Buffer.from([0xff, 0xd8, ...app0, ...sof, ...Array(12).fill(0)])
}

function ico(...sizes: number[]): Buffer {
	const buf = Buffer.alloc(6 + sizes.length * 16)
	buf.writeUInt16LE(1, 2)
	buf.writeUInt16LE(sizes.length, 4)
	sizes.forEach((size, i) => {
		buf[6 + i * 16] = size === 256 ? 0 : size
		buf[7 + i * 16] = size === 256 ? 0 : size
	})

	return buf
}

function webp(width: number, height: number): Buffer {
	const buf = Buffer.alloc(30)
	buf.write('RIFF', 0, 'latin1')
	buf.write('WEBP', 8, 'latin1')
	buf.write('VP8X', 12, 'latin1')
	buf.writeUIntLE(width - 1, 24, 3)
	buf.writeUIntLE(height - 1, 27, 3)

	return buf
}

describe('imageSize', () => {
	it.each([
		['PNG', png(1200, 630), { format: 'png', width: 1200, height: 630 }],
		['JPEG', jpeg(800, 418), { format: 'jpeg', width: 800, height: 418 }],
		['WebP', webp(1200, 630), { format: 'webp', width: 1200, height: 630 }],
		[
			'GIF',
			Buffer.concat([Buffer.from('GIF89a'), Buffer.from([32, 0, 16, 0]), Buffer.alloc(8)]),
			{ format: 'gif', width: 32, height: 16 }
		],
		[
			'SVG with a viewBox',
			Buffer.from(
				'<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"></svg>'
			),
			{ format: 'svg', width: 64, height: 32 }
		]
	])('reads a %s', (_, buf, expected) => {
		expect(imageSize(buf)).toMatchObject(expected)
	})

	it('lists every size in an .ico and reports the largest', () => {
		expect(imageSize(ico(16, 32, 256))).toEqual({
			format: 'ico',
			width: 256,
			height: 256,
			sizes: ['16x16', '32x32', '256x256']
		})
	})

	it("returns null for things that aren't images", () => {
		expect(
			imageSize(Buffer.from('<!doctype html><html><body>Not found</body></html>'))
		).toBeNull()
	})
})

describe('readSocialMeta', () => {
	const $ = cheerio.load(`<html><head>
		<title>Bags | Shop</title>
		<meta property="og:title" content="Leather bags">
		<meta property="og:title" content="A second title">
		<meta property="og:image" content="/og.jpg">
		<meta name="twitter:card" content="summary_large_image">
		<meta name="theme-color" content="#000" media="(prefers-color-scheme: dark)">
		<meta name="theme-color" content="#7a4b2a">
		<link rel="icon" href="/favicon.svg" type="image/svg+xml">
		<link rel="apple-touch-icon" sizes="180x180" href="https://cdn.example.com/touch.png">
		<link rel="fluid-icon" href="/fluidicon.png">
		<link rel="manifest" href="/site.webmanifest">
	</head><body></body></html>`)
	const meta = readSocialMeta($, BASE, [
		{
			'@context': 'https://schema.org',
			'@graph': [{ '@type': 'WebSite', name: 'Example Shop' }]
		}
	])

	it('keeps the first value of each tag', () => {
		expect(meta.og['og:title']).toBe('Leather bags')
		expect(meta.twitter['twitter:card']).toBe('summary_large_image')
	})

	it('resolves image, icon and manifest URLs, skipping non-browser icons', () => {
		expect(meta.ogImageRaw).toBe('/og.jpg')
		expect(meta.ogImage).toBe('https://www.shop.example.com/og.jpg')
		expect(meta.manifestUrl).toBe('https://www.shop.example.com/site.webmanifest')
		expect(meta.iconLinks.map((l) => [l.rel, l.href])).toEqual([
			['icon', 'https://www.shop.example.com/favicon.svg'],
			['apple-touch-icon', 'https://cdn.example.com/touch.png']
		])
	})

	it('prefers a theme color without a media query', () => {
		expect(meta.themeColor).toBe('#7a4b2a')
	})

	it('finds the site name in structured data', () => {
		expect(meta.schemaName).toBe('Example Shop')
	})

	it('groups every tag for the tag table', () => {
		const groups = new Set(meta.tags.map((t) => t.group))
		expect([...groups].sort()).toEqual(['Basics', 'Icons and app', 'Open Graph', 'X'])
		expect(meta.tags[0]).toEqual({ group: 'Basics', key: 'title', value: 'Bags | Shop' })
	})
})

function image(overrides: Partial<ImageAsset> = {}): ImageAsset {
	return {
		url: 'https://shop.example.com/og.jpg',
		status: 200,
		ok: true,
		format: 'jpeg',
		width: 1200,
		height: 630,
		bytes: 120_000,
		...overrides
	}
}

function icon(kind: IconAsset['kind'], overrides: Partial<IconAsset> = {}): IconAsset {
	return {
		...image({
			url: `https://shop.example.com/${kind}.png`,
			format: 'png',
			width: 32,
			height: 32
		}),
		kind,
		source: 'test',
		...overrides
	}
}

function previewsFor(html: string, assets: { ogImage?: ImageAsset; icons?: IconAsset[] } = {}) {
	const $ = cheerio.load(html)
	const previews = buildPreviews({
		meta: readSocialMeta($, BASE, []),
		title: $('title').text(),
		description: $('meta[name=description]').attr('content') ?? '',
		text: 'Handmade leather bags from Dublin.',
		finalUrl: BASE,
		ogImage: assets.ogImage,
		icons: assets.icons ?? []
	})

	return (platform: SharePlatform) => {
		const preview = previews.find((p) => p.platform === platform)
		if (!preview) throw new Error(`No ${platform} preview`)

		return preview
	}
}

const TAGS = `<title>Bags</title>
	<meta name="description" content="Handmade in Dublin.">
	<meta property="og:title" content="Leather bags">
	<meta property="og:site_name" content="Example Shop">
	<meta property="og:image" content="/og.jpg">
	<meta name="theme-color" content="#7a4b2a">`

describe('buildPreviews', () => {
	it('covers every platform', () => {
		const preview = previewsFor(TAGS, { ogImage: image() })
		for (const platform of [
			'google',
			'facebook',
			'x',
			'linkedin',
			'slack',
			'discord',
			'whatsapp',
			'telegram',
			'imessage'
		] as const) {
			expect(preview(platform).domain).toBe('shop.example.com')
		}
	})

	it('shows a large image where the image is big enough', () => {
		const preview = previewsFor(TAGS, { ogImage: image() })
		expect(preview('facebook').layout).toBe('large')
		expect(preview('linkedin').layout).toBe('large')
		expect(preview('whatsapp').layout).toBe('large')
		expect(preview('telegram').layout).toBe('large')
		expect(preview('imessage').layout).toBe('large')
		expect(preview('facebook').siteName).toBe('Example Shop')
	})

	it('uses a small X card without twitter:card', () => {
		const preview = previewsFor(TAGS, { ogImage: image() })
		expect(preview('x').layout).toBe('small')
		expect(preview('x').notes[0].tone).toBe('warn')
		expect(preview('slack').layout).toBe('small')
	})

	it('uses a large X card with summary_large_image', () => {
		const preview = previewsFor(
			`${TAGS}<meta name="twitter:card" content="summary_large_image">`,
			{ ogImage: image() }
		)
		expect(preview('x').layout).toBe('large')
		expect(preview('discord').layout).toBe('large')
		expect(preview('discord').accent).toBe('#7a4b2a')
	})

	it('shrinks small images to thumbnails', () => {
		const preview = previewsFor(TAGS, { ogImage: image({ width: 400, height: 210 }) })
		expect(preview('facebook').layout).toBe('small')
		expect(preview('linkedin').layout).toBe('small')
		expect(preview('whatsapp').layout).toBe('small')
	})

	it('drops images X and Facebook would refuse', () => {
		const preview = previewsFor(
			`${TAGS}<meta name="twitter:card" content="summary_large_image">`,
			{
				ogImage: image({ bytes: 9 * 1024 * 1024 })
			}
		)
		expect(preview('facebook').layout).toBe('none')
		expect(preview('x').layout).toBe('none')
		expect(preview('facebook').notes.some((n) => n.tone === 'fail')).toBe(true)
	})

	it('falls back to the title and an icon without Open Graph tags', () => {
		const preview = previewsFor('<title>Bags</title>', {
			icons: [icon('apple-touch-icon', { width: 180, height: 180 })]
		})
		expect(preview('facebook').title).toBe('Bags')
		expect(preview('facebook').siteName).toBe('shop.example.com')
		expect(preview('discord').siteName).toBe('')
		expect(preview('imessage').layout).toBe('none')
		expect(preview('imessage').icon).toBe('https://shop.example.com/apple-touch-icon.png')
	})

	it('says when a preview looks good', () => {
		const preview = previewsFor(TAGS, {
			ogImage: image(),
			icons: [icon('favicon', { format: 'svg' })]
		})
		expect(preview('google').notes).toEqual([{ tone: 'pass', text: 'Looks good.' }])
	})
})

describe('bestFavicon', () => {
	it('prefers an SVG, then the largest working icon', () => {
		const small = icon('favicon', { url: 'a', width: 16, height: 16 })
		const large = icon('favicon', { url: 'b', width: 64, height: 64 })
		const broken = icon('favicon', { url: 'c', ok: false, width: 512, height: 512 })
		const svg = icon('favicon', { url: 'd', format: 'svg' })
		expect(bestFavicon([small, large, broken])?.url).toBe('b')
		expect(bestFavicon([small, svg, large])?.url).toBe('d')
		expect(bestFavicon([])).toBeUndefined()
	})
})
