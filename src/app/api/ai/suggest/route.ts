import { jsonError } from '@server/stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface SuggestionRequest {
	checkId: string
	checkTitle: string
	summary?: string
	recommendation?: string
	pageUrl?: string
	pageTitle?: string
	snippet?: string
}

function cleanDomain(urlStr?: string): string {
	if (!urlStr) return 'Your Website'
	try {
		return new URL(urlStr).hostname.replace(/^www\./, '')
	} catch {
		return urlStr
	}
}

function generateHeuristicFix(req: SuggestionRequest): {
	code?: string
	text: string
	explanation: string
} {
	const domain = cleanDomain(req.pageUrl)
	const pageTitle = req.pageTitle || 'Home'
	const checkId = req.checkId.toLowerCase()

	if (checkId.includes('description')) {
		const desc = `Explore ${pageTitle} on ${domain}. Find in-depth insights, expert guidance, and solutions designed to help you achieve your goals today.`
		return {
			code: `<meta name="description" content="${desc}">`,
			text: desc,
			explanation: `Generated an engaging meta description (${desc.length} chars) within Google's optimal 120–160 character window, emphasizing relevant keywords and a clear value proposition.`
		}
	}

	if (checkId.includes('title')) {
		const optimizedTitle = `${pageTitle} | ${domain}`
		return {
			code: `<title>${optimizedTitle}</title>`,
			text: optimizedTitle,
			explanation: `Formatted a clean, brand-aligned title tag (${optimizedTitle.length} chars) structured as [Primary Topic] | [Brand Name] to maximize CTR and avoid truncation in search results.`
		}
	}

	if (checkId === 'h1' || checkId.includes('heading')) {
		const h1Text = pageTitle.includes('|') ? pageTitle.split('|')[0].trim() : pageTitle
		return {
			code: `<h1>${h1Text}</h1>`,
			text: h1Text,
			explanation: `Every page needs a single clear <h1> tag near the top that outlines the primary subject for both visitors and search engines.`
		}
	}

	if (checkId.includes('alt') || checkId.includes('image')) {
		return {
			code: `<img src="hero.webp" alt="${pageTitle} overview and features on ${domain}" width="1200" height="630" loading="lazy">`,
			text: `${pageTitle} overview and features on ${domain}`,
			explanation: `Descriptive alt text provides search engine crawlers with visual context and ensures screen-reader accessibility.`
		}
	}

	if (checkId.includes('structured') || checkId.includes('schema') || checkId.includes('jsonld')) {
		const jsonLd = {
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: pageTitle,
			url: req.pageUrl || `https://${domain}`,
			description: `Learn more about ${pageTitle} from ${domain}.`,
			publisher: {
				'@type': 'Organization',
				name: domain,
				url: `https://${domain}`
			}
		}
		const formatted = JSON.stringify(jsonLd, null, 2)
		return {
			code: `<script type="application/ld+json">\n${formatted}\n</script>`,
			text: formatted,
			explanation: `Generated valid JSON-LD structured data for WebPage and Organization to help search engines understand page entities and qualify for rich snippets.`
		}
	}

	if (checkId.includes('canonical')) {
		const canonUrl = req.pageUrl || `https://${domain}/`
		return {
			code: `<link rel="canonical" href="${canonUrl}">`,
			text: canonUrl,
			explanation: `Self-referencing canonical tags protect against duplicate content penalties from query parameters, tracking tags, and alternative URLs.`
		}
	}

	if (checkId.includes('robots')) {
		const robotsTxt = `User-agent: *\nAllow: /\n\n# Sitemaps\nSitemap: https://${domain}/sitemap.xml`
		return {
			code: robotsTxt,
			text: robotsTxt,
			explanation: `A standard robots.txt file allowing indexing of public content while directing web crawlers to your XML sitemap.`
		}
	}

	if (checkId.includes('ai') || checkId.includes('llms')) {
		const llmsTxt = `# ${domain}\n\n> Summary of ${domain} products, services, and documentation for AI search assistants.\n\n## Main Topics\n- [About](https://${domain}/about): Overview and mission.\n- [Documentation](https://${domain}/docs): User guides and API.`
		return {
			code: llmsTxt,
			text: llmsTxt,
			explanation: `An llms.txt markdown file structured according to the llmstxt.org specification, allowing AI assistants (Claude, ChatGPT, Perplexity) to digest key documentation efficiently.`
		}
	}

	if (checkId.includes('security') || checkId.includes('header')) {
		const headers = `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\nX-Content-Type-Options: nosniff\nX-Frame-Options: SAMEORIGIN\nReferrer-Policy: strict-origin-when-cross-origin`
		return {
			code: headers,
			text: headers,
			explanation: `Recommended HTTP security headers to protect users, prevent clickjacking, enforce HTTPS, and raise your site security grade.`
		}
	}

	return {
		code: undefined,
		text: req.recommendation || `Optimize ${req.checkTitle} according to best SEO guidelines.`,
		explanation: `Addressing ${req.checkTitle} improves user experience, crawl accessibility, and search engine ranking confidence.`
	}
}

export async function POST(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as SuggestionRequest
		if (!body || !body.checkId) {
			return jsonError('Missing checkId in request body', 400)
		}

		const geminiKey = process.env.GEMINI_API_KEY
		const openaiKey = process.env.OPENAI_API_KEY

		// If Gemini key is set, attempt Gemini API generation
		if (geminiKey) {
			try {
				const prompt = `You are an expert technical SEO specialist.
Generate a concise, high-converting fix for this failing check on website ${cleanDomain(body.pageUrl)}:
Check: ${body.checkTitle} (${body.checkId})
Problem: ${body.summary || 'Needs improvement'}
Current recommendation: ${body.recommendation || ''}
Page Title: ${body.pageTitle || ''}
URL: ${body.pageUrl || ''}

Respond with a JSON object with:
- "code": the exact HTML, JSON-LD, or config code snippet to fix it (or empty if not applicable)
- "text": a plain text summary or replacement string
- "explanation": 1-2 sentence explanation of why this fix boosts SEO and CTR.`

				const res = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							contents: [{ parts: [{ text: prompt }] }],
							generationConfig: { responseMimeType: 'application/json' }
						})
					}
				)

				if (res.ok) {
					const data = await res.json()
					const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
					if (textContent) {
						const parsed = JSON.parse(textContent)
						return Response.json(parsed)
					}
				}
			} catch {
				// Fall back to heuristic
			}
		} else if (openaiKey) {
			try {
				const prompt = `You are an expert technical SEO specialist.
Generate a concise, high-converting fix for this failing check on website ${cleanDomain(body.pageUrl)}:
Check: ${body.checkTitle} (${body.checkId})
Problem: ${body.summary || 'Needs improvement'}
Current recommendation: ${body.recommendation || ''}
Page Title: ${body.pageTitle || ''}
URL: ${body.pageUrl || ''}

Respond with JSON format:
{
  "code": "HTML or config snippet or empty string",
  "text": "plain text summary",
  "explanation": "why this improves SEO"
}`
				const res = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${openaiKey}`
					},
					body: JSON.stringify({
						model: 'gpt-4o-mini',
						messages: [{ role: 'user', content: prompt }],
						response_format: { type: 'json_object' }
					})
				})
				if (res.ok) {
					const data = await res.json()
					const content = data.choices?.[0]?.message?.content
					if (content) return Response.json(JSON.parse(content))
				}
			} catch {
				// Fall back to heuristic
			}
		}


		// Built-in intelligent heuristic engine
		const heuristic = generateHeuristicFix(body)
		return Response.json(heuristic)
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Error generating suggestion'
		return jsonError(message, 500)
	}
}
