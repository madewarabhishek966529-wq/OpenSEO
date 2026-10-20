import type * as cheerio from 'cheerio'
import type { PageSpeedResult, SharingReport, Technology } from '@shared/types'
import type { SafeFetchResult } from './http'
import type { DnsInfo, TlsInfo } from './network'
import type { RobotsTxt } from './robots'
import type { SocialMeta } from './social-meta'

export type CheerioRoot = cheerio.CheerioAPI

export interface LinkInfo {
	href: string
	text: string
	rel: string
	internal: boolean
	nofollow: boolean
	hasImage: boolean
	/** The link's accessible name: its text, aria-label, title or image alt. */
	label: string
}

export interface ImageInfo {
	src: string
	alt: string | null
	width?: string
	height?: string
	loading?: string
}

export type ResourceType = 'script' | 'stylesheet' | 'image' | 'font'

export interface ResourceInfo {
	url: string
	type: ResourceType
	inHead: boolean
	/** A script or stylesheet in <head> that stops the page from rendering until it loads. */
	blocking: boolean
	status?: number
	/** Size after decompression. */
	bytes?: number
	/** Size on the wire. */
	transferBytes?: number
	contentType?: string
	encoding?: string | null
	cacheControl?: string | null
	expires?: string | null
	timeMs?: number
	minified?: boolean
	error?: string
}

export interface LinkCheck {
	url: string
	status: number | null
	/** "blocked" means the site refused our check (401, 403, 429), so we can't tell. */
	state: 'ok' | 'broken' | 'blocked' | 'unreachable'
	internal: boolean
	error?: string
}

export interface ParsedPage {
	html: string
	$: CheerioRoot
	finalUrl: URL
	text: string
	wordCount: number
	title: string
	description: string
	generator: string
	links: LinkInfo[]
	mailtoLinks: string[]
	images: ImageInfo[]
	jsonLd: { types: string[]; errors: number; items: unknown[] }
	microdataTypes: string[]
	social: SocialMeta
	tech: Technology[]
}

/** What we learned from the extra requests made around the page. */
export interface Gathered {
	robots: { url: string; found: boolean; status?: number; parsed?: RobotsTxt; error?: string }
	sitemap: {
		found: boolean
		url?: string
		urlCount?: number
		isIndex?: boolean
		source?: 'robots.txt' | 'default location'
		tried: string[]
	}
	llmsTxt: { url: string; found: boolean; bytes?: number }
	httpRedirect: {
		checked: boolean
		redirectsToHttps?: boolean
		finalUrl?: string
		error?: string
	}
	tls?: TlsInfo
	dns?: DnsInfo
	resources: ResourceInfo[]
	resourcesDiscovered: number
	inlineScriptBytes: number
	inlineStyleBytes: number
	linkChecks: LinkCheck[]
	linksDiscovered: number
	sharing: SharingReport
}

/** Everything a check can look at. */
export interface AuditContext extends ParsedPage, Gathered {
	inputUrl: string
	page: SafeFetchResult
	pagespeed?: PageSpeedResult
	pagespeedEnabled: boolean
}
