import type { Technology } from '@shared/types'

interface Signature {
	name: string
	category: string
	html?: RegExp
	header?: [string, RegExp]
	generator?: RegExp
}

const SIGNATURES: Signature[] = [
	// CMS & site builders
	{
		name: 'WordPress',
		category: 'CMS',
		html: /\/wp-(content|includes)\//i,
		generator: /wordpress/i
	},
	{ name: 'WooCommerce', category: 'E-commerce', html: /woocommerce/i },
	{
		name: 'Shopify',
		category: 'E-commerce',
		html: /cdn\.shopify\.com|Shopify\.theme/i,
		header: ['x-shopid', /./]
	},
	{
		name: 'Wix',
		category: 'Site builder',
		html: /static\.wixstatic\.com|wix-bolt/i,
		header: ['x-wix-request-id', /./]
	},
	{
		name: 'Squarespace',
		category: 'Site builder',
		html: /static1\.squarespace\.com|squarespace-cdn/i
	},
	{
		name: 'Webflow',
		category: 'Site builder',
		html: /data-wf-page|webflow\.js|assets\.website-files\.com/i,
		generator: /webflow/i
	},
	{
		name: 'Framer',
		category: 'Site builder',
		html: /framerusercontent\.com|data-framer-/i,
		generator: /framer/i
	},
	{ name: 'Ghost', category: 'CMS', generator: /ghost/i },
	{
		name: 'Drupal',
		category: 'CMS',
		html: /Drupal\.settings|\/sites\/default\/files/i,
		generator: /drupal/i,
		header: ['x-generator', /drupal/i]
	},
	{ name: 'Joomla', category: 'CMS', generator: /joomla/i },
	{
		name: 'HubSpot CMS',
		category: 'CMS',
		html: /hs-sites\.com|hubspot-cms/i,
		generator: /hubspot/i
	},
	{
		name: 'Magento',
		category: 'E-commerce',
		html: /Mage\.Cookies|\/static\/version\d+\/frontend/i
	},
	{ name: 'BigCommerce', category: 'E-commerce', html: /cdn\d*\.bigcommerce\.com/i },
	// Frameworks
	{
		name: 'Next.js',
		category: 'Framework',
		html: /__NEXT_DATA__|\/_next\/static\//,
		header: ['x-powered-by', /next\.js/i]
	},
	{ name: 'Nuxt', category: 'Framework', html: /__NUXT__|\/_nuxt\//i },
	{ name: 'Gatsby', category: 'Framework', html: /___gatsby|gatsby-/i, generator: /gatsby/i },
	{
		name: 'Astro',
		category: 'Framework',
		html: /astro-island|data-astro-cid/i,
		generator: /astro/i
	},
	{ name: 'SvelteKit', category: 'Framework', html: /__sveltekit|data-sveltekit/i },
	{ name: 'Remix', category: 'Framework', html: /__remixContext|__remixManifest/i },
	{ name: 'Angular', category: 'Framework', html: /ng-version=/i },
	{
		name: 'Vue.js',
		category: 'Framework',
		html: /data-v-[a-f0-9]{6,}|vue(\.runtime)?(\.min)?\.js/i
	},
	{
		name: 'React',
		category: 'Framework',
		html: /data-reactroot|react-dom(\.production)?(\.min)?\.js|__NEXT_DATA__|_reactListening/i
	},
	{ name: 'jQuery', category: 'JavaScript library', html: /jquery[.-]?(\d[\d.]*)?(\.min)?\.js/i },
	{
		name: 'Bootstrap',
		category: 'UI framework',
		html: /bootstrap(\.bundle)?(\.min)?\.(css|js)/i
	},
	{
		name: 'Tailwind CSS',
		category: 'UI framework',
		html: /class="[^"]*\b(?:flex|grid) [^"]*\b(?:px|py|mt|mb)-\d[^"]*\b(?:text|bg)-(?:gray|slate|zinc|neutral)-\d{2,3}/
	},
	// Analytics & marketing
	{
		name: 'Google Analytics',
		category: 'Analytics',
		html: /googletagmanager\.com\/gtag\/js\?id=G-|google-analytics\.com\/(analytics|ga)\.js|gtag\(\s*['"]config['"]\s*,\s*['"]G-/i
	},
	{
		name: 'Google Tag Manager',
		category: 'Tag manager',
		html: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/i
	},
	{ name: 'Plausible', category: 'Analytics', html: /plausible\.io\/js/i },
	{ name: 'Fathom', category: 'Analytics', html: /cdn\.usefathom\.com/i },
	{ name: 'Matomo', category: 'Analytics', html: /matomo\.js|piwik\.js|_paq\.push/i },
	{ name: 'Umami', category: 'Analytics', html: /umami(\.is)?\/script\.js|data-website-id=/i },
	{ name: 'Simple Analytics', category: 'Analytics', html: /scripts\.simpleanalyticscdn\.com/i },
	{
		name: 'Vercel Analytics',
		category: 'Analytics',
		html: /\/_vercel\/insights\/script\.js|va\.vercel-scripts\.com/i
	},
	{
		name: 'Cloudflare Web Analytics',
		category: 'Analytics',
		html: /static\.cloudflareinsights\.com\/beacon/i
	},
	{
		name: 'PostHog',
		category: 'Analytics',
		html: /posthog(-js)?|us\.i\.posthog\.com|eu\.i\.posthog\.com/i
	},
	{ name: 'Mixpanel', category: 'Analytics', html: /cdn\.mxpnl\.com|mixpanel\.init/i },
	{ name: 'Segment', category: 'Analytics', html: /cdn\.segment\.com\/analytics\.js/i },
	{ name: 'Heap', category: 'Analytics', html: /cdn\.heapanalytics\.com/i },
	{ name: 'Hotjar', category: 'Analytics', html: /static\.hotjar\.com|hjSiteSettings/i },
	{ name: 'Microsoft Clarity', category: 'Analytics', html: /clarity\.ms\/tag/i },
	{
		name: 'Facebook Pixel',
		category: 'Advertising',
		html: /connect\.facebook\.net\/[^"']+\/fbevents\.js|fbq\(\s*['"]init/i
	},
	{
		name: 'LinkedIn Insight',
		category: 'Advertising',
		html: /snap\.licdn\.com\/li\.lms-analytics/i
	},
	{ name: 'TikTok Pixel', category: 'Advertising', html: /analytics\.tiktok\.com/i },
	{
		name: 'Google Ads',
		category: 'Advertising',
		html: /googleadservices\.com|gtag\(\s*['"]config['"]\s*,\s*['"]AW-/i
	},
	{
		name: 'HubSpot',
		category: 'Marketing automation',
		html: /js\.hs-scripts\.com|js\.hsforms\.net/i
	},
	{
		name: 'Mailchimp',
		category: 'Marketing automation',
		html: /chimpstatic\.com|list-manage\.com/i
	},
	// Widgets
	{ name: 'Intercom', category: 'Live chat', html: /widget\.intercom\.io|intercomSettings/i },
	{ name: 'Crisp', category: 'Live chat', html: /client\.crisp\.chat/i },
	{ name: 'Drift', category: 'Live chat', html: /js\.driftt\.com/i },
	{ name: 'Zendesk', category: 'Live chat', html: /static\.zdassets\.com/i },
	{ name: 'Tawk.to', category: 'Live chat', html: /embed\.tawk\.to/i },
	{ name: 'Stripe', category: 'Payments', html: /js\.stripe\.com/i },
	{ name: 'PayPal', category: 'Payments', html: /paypal\.com\/sdk\/js|paypalobjects\.com/i },
	{ name: 'reCAPTCHA', category: 'Security', html: /google\.com\/recaptcha|grecaptcha/i },
	{ name: 'hCaptcha', category: 'Security', html: /hcaptcha\.com\/1\/api\.js/i },
	{
		name: 'Cloudflare Turnstile',
		category: 'Security',
		html: /challenges\.cloudflare\.com\/turnstile/i
	},
	{ name: 'OneTrust', category: 'Cookie consent', html: /cdn\.cookielaw\.org|onetrust/i },
	{ name: 'Cookiebot', category: 'Cookie consent', html: /consent\.cookiebot\.com/i },
	{
		name: 'Google Fonts',
		category: 'Fonts',
		html: /fonts\.googleapis\.com|fonts\.gstatic\.com/i
	},
	{ name: 'Adobe Fonts', category: 'Fonts', html: /use\.typekit\.net/i },
	{ name: 'Font Awesome', category: 'Fonts', html: /font-?awesome|kit\.fontawesome\.com/i },
	{ name: 'YouTube', category: 'Video', html: /youtube\.com\/embed|youtube-nocookie\.com/i },
	{ name: 'Vimeo', category: 'Video', html: /player\.vimeo\.com/i },
	{ name: 'Sentry', category: 'Monitoring', html: /browser\.sentry-cdn\.com|sentry\.io\/api/i },
	// Hosting / CDN / servers (headers)
	{ name: 'Cloudflare', category: 'CDN', header: ['cf-ray', /./] },
	{ name: 'Vercel', category: 'Hosting', header: ['x-vercel-id', /./] },
	{ name: 'Netlify', category: 'Hosting', header: ['x-nf-request-id', /./] },
	{ name: 'Amazon CloudFront', category: 'CDN', header: ['x-amz-cf-id', /./] },
	{ name: 'Fastly', category: 'CDN', header: ['x-served-by', /cache-/i] },
	{ name: 'Akamai', category: 'CDN', header: ['x-akamai-transformed', /./] },
	{ name: 'GitHub Pages', category: 'Hosting', header: ['x-github-request-id', /./] },
	{ name: 'Fly.io', category: 'Hosting', header: ['fly-request-id', /./] },
	{ name: 'nginx', category: 'Web server', header: ['server', /nginx/i] },
	{ name: 'Apache', category: 'Web server', header: ['server', /apache/i] },
	{ name: 'LiteSpeed', category: 'Web server', header: ['server', /litespeed/i] },
	{ name: 'Microsoft IIS', category: 'Web server', header: ['server', /iis/i] },
	{ name: 'Caddy', category: 'Web server', header: ['server', /caddy/i] },
	{ name: 'PHP', category: 'Language', header: ['x-powered-by', /php/i] },
	{ name: 'ASP.NET', category: 'Language', header: ['x-powered-by', /asp\.net/i] },
	{ name: 'Express', category: 'Framework', header: ['x-powered-by', /express/i] }
]

/** Recognizes common CMSs, frameworks, analytics, widgets, hosts and servers. */
export function detectTechnologies(
	html: string,
	headers: Headers,
	generator: string
): Technology[] {
	const found = new Map<string, Technology>()
	for (const sig of SIGNATURES) {
		let hit = false
		if (sig.html && sig.html.test(html)) hit = true
		if (!hit && sig.generator && generator && sig.generator.test(generator)) hit = true
		if (!hit && sig.header) {
			const v = headers.get(sig.header[0])
			if (v && sig.header[1].test(v)) hit = true
		}
		if (hit) found.set(sig.name, { name: sig.name, category: sig.category })
	}

	return [...found.values()]
}

export const ANALYTICS_CATEGORIES = new Set(['Analytics', 'Tag manager'])
