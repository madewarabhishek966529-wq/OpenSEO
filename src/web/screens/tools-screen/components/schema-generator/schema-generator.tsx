'use client'

import { memo, useMemo, useState } from 'react'
import type { SchemaType } from './schema-generator.types'

export const SchemaGenerator = memo(() => {
	const [type, setType] = useState<SchemaType>('organization')
	const [copied, setCopied] = useState(false)

	// Form fields
	const [name, setName] = useState('Acme Corporation')
	const [url, setUrl] = useState('https://example.com')
	const [logo, setLogo] = useState('https://example.com/logo.png')

	// Local business fields
	const [telephone, setTelephone] = useState('+1-555-123-4567')
	const [street, setStreet] = useState('123 Market St')
	const [city, setCity] = useState('San Francisco')
	const [postalCode, setPostalCode] = useState('94105')

	// FAQ fields
	const [q1, setQ1] = useState('How does OpenSEO work?')
	const [a1, setA1] = useState(
		'OpenSEO crawls your site and audits on-page tags, performance, security, and AI readiness.'
	)
	const [q2, setQ2] = useState('Is OpenSEO free and open source?')
	const [a2, setA2] = useState('Yes, OpenSEO is 100% open source under the MIT license.')

	// Article fields
	const [headline, setHeadline] = useState('10 Essential SEO Strategies for 2026')
	const [author, setAuthor] = useState('Sarah Jenkins')
	const [datePublished, setDatePublished] = useState('2026-10-20')

	// Product fields
	const [prodName, setProdName] = useState('Ultra Ergonomic Keyboard')
	const [prodPrice, setProdPrice] = useState('149.99')
	const [prodCurrency, setProdCurrency] = useState('USD')

	const generatedJson = useMemo(() => {
		let schemaObj: Record<string, unknown> = {}

		if (type === 'organization') {
			schemaObj = {
				'@context': 'https://schema.org',
				'@type': 'Organization',
				name,
				url,
				logo
			}
		} else if (type === 'localbusiness') {
			schemaObj = {
				'@context': 'https://schema.org',
				'@type': 'LocalBusiness',
				name,
				image: logo,
				telephone,
				address: {
					'@type': 'PostalAddress',
					streetAddress: street,
					addressLocality: city,
					postalCode,
					addressCountry: 'US'
				},
				url
			}
		} else if (type === 'faq') {
			schemaObj = {
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: q1,
						acceptedAnswer: {
							'@type': 'Answer',
							text: a1
						}
					},
					{
						'@type': 'Question',
						name: q2,
						acceptedAnswer: {
							'@type': 'Answer',
							text: a2
						}
					}
				]
			}
		} else if (type === 'article') {
			schemaObj = {
				'@context': 'https://schema.org',
				'@type': 'Article',
				headline,
				image: logo,
				author: {
					'@type': 'Person',
					name: author
				},
				publisher: {
					'@type': 'Organization',
					name,
					logo: {
						'@type': 'ImageObject',
						url: logo
					}
				},
				datePublished
			}
		} else if (type === 'product') {
			schemaObj = {
				'@context': 'https://schema.org',
				'@type': 'Product',
				name: prodName,
				image: logo,
				offers: {
					'@type': 'Offer',
					price: prodPrice,
					priceCurrency: prodCurrency,
					availability: 'https://schema.org/InStock'
				}
			}
		}

		return JSON.stringify(schemaObj, null, 2)
	}, [
		type,
		name,
		url,
		logo,
		telephone,
		street,
		city,
		postalCode,
		q1,
		a1,
		q2,
		a2,
		headline,
		author,
		datePublished,
		prodName,
		prodPrice,
		prodCurrency
	])

	const scriptTag = `<script type="application/ld+json">\n${generatedJson}\n</script>`

	const handleCopy = () => {
		navigator.clipboard.writeText(scriptTag)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="tool-grid">
			<div className="tool-inputs">
				<div className="tool-field-group">
					<label>Select Schema Type</label>
					<select
						className="select"
						value={type}
						onChange={(e) => setType(e.target.value as SchemaType)}
					>
						<option value="organization">Organization</option>
						<option value="localbusiness">Local Business</option>
						<option value="faq">FAQ Page</option>
						<option value="article">Article / Blog Post</option>
						<option value="product">Product</option>
					</select>
				</div>

				{/* Organization & Shared Fields */}
				{(type === 'organization' || type === 'localbusiness' || type === 'article') && (
					<>
						<div className="tool-field-group">
							<label>Entity / Brand Name</label>
							<input
								type="text"
								className="text-input"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="tool-field-group">
							<label>Website URL</label>
							<input
								type="text"
								className="text-input"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
							/>
						</div>
						<div className="tool-field-group">
							<label>Logo / Image URL</label>
							<input
								type="text"
								className="text-input"
								value={logo}
								onChange={(e) => setLogo(e.target.value)}
							/>
						</div>
					</>
				)}

				{/* Local Business Fields */}
				{type === 'localbusiness' && (
					<>
						<div className="tool-field-group">
							<label>Phone Number</label>
							<input
								type="text"
								className="text-input"
								value={telephone}
								onChange={(e) => setTelephone(e.target.value)}
							/>
						</div>
						<div className="tool-field-group">
							<label>Street Address</label>
							<input
								type="text"
								className="text-input"
								value={street}
								onChange={(e) => setStreet(e.target.value)}
							/>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
							<div className="tool-field-group">
								<label>City</label>
								<input
									type="text"
									className="text-input"
									value={city}
									onChange={(e) => setCity(e.target.value)}
								/>
							</div>
							<div className="tool-field-group">
								<label>Postal Code</label>
								<input
									type="text"
									className="text-input"
									value={postalCode}
									onChange={(e) => setPostalCode(e.target.value)}
								/>
							</div>
						</div>
					</>
				)}

				{/* FAQ Fields */}
				{type === 'faq' && (
					<>
						<div className="tool-field-group">
							<label>Question 1</label>
							<input
								type="text"
								className="text-input"
								value={q1}
								onChange={(e) => setQ1(e.target.value)}
							/>
						</div>
						<div className="tool-field-group">
							<label>Answer 1</label>
							<textarea
								className="text-input"
								rows={2}
								value={a1}
								onChange={(e) => setA1(e.target.value)}
							/>
						</div>
						<div className="tool-field-group">
							<label>Question 2</label>
							<input
								type="text"
								className="text-input"
								value={q2}
								onChange={(e) => setQ2(e.target.value)}
							/>
						</div>
						<div className="tool-field-group">
							<label>Answer 2</label>
							<textarea
								className="text-input"
								rows={2}
								value={a2}
								onChange={(e) => setA2(e.target.value)}
							/>
						</div>
					</>
				)}

				{/* Article Fields */}
				{type === 'article' && (
					<>
						<div className="tool-field-group">
							<label>Headline</label>
							<input
								type="text"
								className="text-input"
								value={headline}
								onChange={(e) => setHeadline(e.target.value)}
							/>
						</div>
						<div className="tool-field-group">
							<label>Author Name</label>
							<input
								type="text"
								className="text-input"
								value={author}
								onChange={(e) => setAuthor(e.target.value)}
							/>
						</div>
						<div className="tool-field-group">
							<label>Date Published</label>
							<input
								type="date"
								className="text-input"
								value={datePublished}
								onChange={(e) => setDatePublished(e.target.value)}
							/>
						</div>
					</>
				)}

				{/* Product Fields */}
				{type === 'product' && (
					<>
						<div className="tool-field-group">
							<label>Product Name</label>
							<input
								type="text"
								className="text-input"
								value={prodName}
								onChange={(e) => setProdName(e.target.value)}
							/>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
							<div className="tool-field-group">
								<label>Price</label>
								<input
									type="text"
									className="text-input"
									value={prodPrice}
									onChange={(e) => setProdPrice(e.target.value)}
								/>
							</div>
							<div className="tool-field-group">
								<label>Currency</label>
								<input
									type="text"
									className="text-input"
									value={prodCurrency}
									onChange={(e) => setProdCurrency(e.target.value)}
								/>
							</div>
						</div>
					</>
				)}
			</div>

			<div className="tool-inputs">
				<div className="code-viewer-wrap">
					<div className="code-viewer-header">
						<span>Generated Schema (JSON-LD)</span>
						<button
							type="button"
							className="btn btn--secondary"
							style={{ padding: '4px 10px', fontSize: '12px' }}
							onClick={handleCopy}
						>
							{copied ? '✓ Copied!' : 'Copy Code'}
						</button>
					</div>
					<pre className="code-viewer-pre">
						<code>{scriptTag}</code>
					</pre>
				</div>

				<div
					style={{
						padding: '14px',
						background: 'var(--surface-2)',
						border: '1px solid var(--line)',
						borderRadius: 'var(--radius-lg)',
						fontSize: '12px',
						color: 'var(--ink-2)',
						lineHeight: 1.6
					}}
				>
					✓ <strong>Validation Status:</strong> Valid JSON-LD structured data syntax. Paste this
					script into your HTML <code>&lt;head&gt;</code> tag or CMS template to trigger Google
					Rich Results snippets.
				</div>
			</div>
		</div>
	)
})

SchemaGenerator.displayName = 'SchemaGenerator'
