import { memo } from 'react'
import Link from 'next/link'
import { Icon } from '@web/components/icon'
import type { NavItemProps } from './nav-item.types'

const NavItem = (props: NavItemProps) => {
	const { href, label, icon, active } = props

	return (
		<Link
			href={href}
			className={`nav-item${active ? ' is-active' : ''}`}
			aria-current={active ? 'page' : undefined}
		>
			<span className="nav-item-icon">
				<Icon name={icon} size={16} />
			</span>
			{label}
		</Link>
	)
}

export default memo(NavItem)
