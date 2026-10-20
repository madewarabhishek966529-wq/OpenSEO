import { memo } from 'react'
import type { BrandMarkProps } from './brand-mark.types'

const BrandMark = (props: BrandMarkProps) => {
	const { name, logo, compact = false } = props

	return (
		<span className="brand-mark">
			{logo ? (
				<img className="brand-mark-logo" src={logo} alt={compact ? name : ''} />
			) : (
				<span className="brand-mark-tile" aria-hidden="true">
					<svg
						viewBox="0 0 20 20"
						width="18"
						height="18"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<path d="M4 15.5a8 8 0 0 1 12-10.4" />
						<path d="M7 15.5a5 5 0 0 1 7.2-6.3" />
						<circle cx="10.5" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
					</svg>
				</span>
			)}
			{!compact && <span className="brand-mark-name">{name}</span>}
		</span>
	)
}

export default memo(BrandMark)
