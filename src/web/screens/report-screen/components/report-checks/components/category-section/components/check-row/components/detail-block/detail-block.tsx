import { memo } from 'react'
import { formatNumber } from '@shared/format'
import type { DetailBlockProps } from './detail-block.types'

/** The evidence behind a check: a list, a table, a preview, screenshots… */
const DetailBlock = (props: DetailBlockProps) => {
	const { detail } = props

	switch (detail.kind) {
		case 'list':
			return (
				<div className="detail">
					<ul className="detail-list">
						{detail.items.map((item, i) => (
							<li key={i}>{item}</li>
						))}
					</ul>
					{detail.more && (
						<p className="detail-more muted">and {formatNumber(detail.more)} more</p>
					)}
				</div>
			)
		case 'table':
			return (
				<div className="detail detail-scroll">
					<table className="detail-table">
						<thead>
							<tr>
								{detail.columns.map((column) => (
									<th key={column}>{column}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{detail.rows.map((row, i) => (
								<tr key={i}>
									{row.map((value, j) => (
										<td
											key={j}
											className={
												typeof value === 'number' ? 'mono' : undefined
											}
										>
											{value}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
					{detail.more && (
						<p className="detail-more muted">
							and {formatNumber(detail.more)} more rows
						</p>
					)}
				</div>
			)
		case 'kv':
			return (
				<dl className="detail detail-kv">
					{detail.items.map(([key, value]) => (
						<div key={key}>
							<dt>{key}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			)
		case 'code':
			return <pre className="detail detail-code">{detail.text}</pre>
		case 'serp':
			return (
				<div className="detail serp-preview">
					<span className="serp-url">{detail.url}</span>
					<span className="serp-title">{detail.title}</span>
					<span className="serp-description">{detail.description}</span>
				</div>
			)
		case 'social':
			return (
				<div className="detail social-card">
					{detail.image ? (
						// User content from the audited site.
						<img
							className="social-card-image"
							src={detail.image}
							alt=""
							loading="lazy"
						/>
					) : (
						<span className="social-card-image social-card-image--empty">No image</span>
					)}
					<span className="social-card-text">
						<span className="social-card-site">{detail.site}</span>
						<strong>{detail.title || 'No title'}</strong>
						<span>{detail.description || 'No description'}</span>
					</span>
				</div>
			)
		case 'screenshots':
			return (
				<div className="detail screenshots">
					{detail.items.map((shot) => (
						<figure
							key={shot.label}
							className={`screenshot screenshot--${shot.label.toLowerCase()}`}
						>
							<img
								src={shot.src}
								alt={`The page on a ${shot.label.toLowerCase()}`}
								loading="lazy"
							/>
							<figcaption className="muted">{shot.label}</figcaption>
						</figure>
					))}
				</div>
			)
		case 'tags':
			return (
				<ul className="detail tag-list">
					{detail.items.map((tag) => (
						<li
							key={tag.label}
							className={`chip${tag.tone ? ` chip--${tag.tone}` : ''}`}
						>
							{tag.label}
						</li>
					))}
				</ul>
			)
		case 'metrics':
			return (
				<dl className="detail metric-row metric-row--compact">
					{detail.items.map((metric) => (
						<div key={metric.label} className="metric">
							<dt>
								{metric.tone && (
									<span
										className={`metric-dot is-${metric.tone}`}
										aria-hidden="true"
									/>
								)}
								{metric.label}
							</dt>
							<dd className="mono">{metric.value}</dd>
						</div>
					))}
				</dl>
			)
		default:
			return null
	}
}

export default memo(DetailBlock)
