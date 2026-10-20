'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandMark } from '@web/components/brand-mark'
import { Icon } from '@web/components/icon'
import { NavItem } from './components/nav-item'
import { NAV, REPOSITORY_URL } from './app-shell.constants'
import type { AppShellProps } from './app-shell.types'
import { isActive } from './app-shell.utils'

/** The app window: a sidebar of sections on the left, the current page in a panel on the right. */
const AppShell = (props: AppShellProps) => {
	const { children, brandName, brandLogo } = props

	const pathname = usePathname()

	return (
		<div className="app-shell">
			<aside className="sidebar">
				<Link href="/" className="sidebar-brand">
					<BrandMark name={brandName} logo={brandLogo} />
				</Link>
				<nav className="sidebar-nav" aria-label="Sections">
					{NAV.map((group) => (
						<div key={group.title} className="sidebar-group">
							<span className="sidebar-group-title">{group.title}</span>
							{group.items.map((item) => (
								<NavItem
									key={item.href}
									href={item.href}
									label={item.label}
									icon={item.icon}
									active={isActive(item.href, pathname)}
								/>
							))}
						</div>
					))}
				</nav>
				<a
					className="sidebar-footer"
					href={REPOSITORY_URL}
					target="_blank"
					rel="noreferrer"
				>
					<Icon name="code" size={15} />
					<span>Open source · MIT</span>
				</a>
			</aside>
			<main className="app-panel">{children}</main>
		</div>
	)
}

export default memo(AppShell)
