import { memo } from 'react'
import { displayUrl, formatMs, formatNumber } from '@shared/format'
import { CRAWL_ISSUES } from '@shared/crawl-issues'
import { MAX_ROWS } from './page-table.constants'
import { pageNote } from './page-table.utils'
import type { PageTableProps } from './page-table.types'

const PageTable = (props: PageTableProps) => {
	const { pages } = props

	const shown = pages.slice(0, MAX_ROWS)

	return (
		<div className="table-wrap">
			<table className="data-table page-table">
				<thead>
					<tr>
						<th>Page</th>
						<th>Status</th>
						<th>Response</th>
						<th>Words</th>
						<th>Issues</th>
					</tr>
				</thead>
				<tbody>
					{shown.map((page) => (
						<tr key={page.url}>
							<td className="page-table-page">
								<a
									href={page.url}
									target="_blank"
									rel="noreferrer"
									className="mono"
								>
									{displayUrl(page.url)}
								</a>
								<span className="muted">{pageNote(page)}</span>
							</td>
							<td>
								<span
									className={`chip ${page.status && page.status < 400 ? 'chip--pass' : 'chip--fail'}`}
								>
									<span className="chip-dot" />
									{page.status ?? 'Error'}
								</span>
							</td>
							<td className="mono">
								{page.responseMs ? formatMs(page.responseMs) : '–'}
							</td>
							<td className="mono">
								{page.wordCount !== undefined ? formatNumber(page.wordCount) : '–'}
							</td>
							<td>
								<span
									className="page-table-issues"
									title={page.issues.map((i) => CRAWL_ISSUES[i].title).join('\n')}
								>
									{page.issues.length}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{pages.length > shown.length && (
				<p className="muted table-note">
					Showing {shown.length} of {pages.length} pages. Export the CSV to see them all.
				</p>
			)}
		</div>
	)
}

export default memo(PageTable)
