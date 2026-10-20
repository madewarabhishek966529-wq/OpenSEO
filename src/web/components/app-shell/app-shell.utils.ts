/** A nav item is active on its own page and on pages below it ("/crawls/abc" for "/crawls"). */
export function isActive(href: string, pathname: string): boolean {
	return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}
