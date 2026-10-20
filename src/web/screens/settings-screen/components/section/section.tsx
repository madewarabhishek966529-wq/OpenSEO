import { memo } from 'react'
import type { SectionProps } from './section.types'

const Section = (props: SectionProps) => {
	const { id, title, description, children } = props

	return (
		<section className="settings-section" id={id}>
			<div className="settings-section-head">
				<h2>{title}</h2>
				{description && <p className="muted">{description}</p>}
			</div>
			<div className="settings-section-body">{children}</div>
		</section>
	)
}

export default memo(Section)
