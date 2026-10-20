import { memo } from 'react'
import { Icon } from '@web/components/icon'
import { GROUPS } from './meta-tags.constants'
import type { MetaTagsProps } from './meta-tags.types'

/** Every tag that shapes a shared link, grouped, behind a disclosure. */
const MetaTags = (props: MetaTagsProps) => {
	const { tags } = props

	return (
		<details className="share-tags">
			<summary>
				All social and icon tags
				<span className="filter-tab-count mono">{tags.length}</span>
				<Icon className="share-tags-chevron" name="chevronDown" size={15} />
			</summary>
			<div className="detail-scroll">
				<table className="detail-table share-tags-table">
					{GROUPS.map((group) => {
						const rows = tags.filter((tag) => tag.group === group)
						if (!rows.length) return null

						return (
							<tbody key={group}>
								<tr>
									<th colSpan={2}>{group}</th>
								</tr>
								{rows.map((tag, i) => (
									<tr key={`${tag.key}-${i}`}>
										<td className="mono">{tag.key}</td>
										<td>{tag.value}</td>
									</tr>
								))}
							</tbody>
						)
					})}
				</table>
			</div>
		</details>
	)
}

export default memo(MetaTags)
