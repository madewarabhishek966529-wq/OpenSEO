import { memo } from 'react'
import type { PageHeaderProps } from './page-header.types'

const PageHeader = (props: PageHeaderProps) => {
	const { title, description, eyebrow, actions } = props

	return (
		<header className="page-header">
			<div className="page-header-text">
				{eyebrow && <span className="section-label">{eyebrow}</span>}
				<h1>{title}</h1>
				{description && <p className="page-header-description">{description}</p>}
			</div>
			{actions && <div className="page-header-actions">{actions}</div>}
		</header>
	)
}

export default memo(PageHeader)
