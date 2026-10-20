import { memo } from 'react'
import { Icon } from '@web/components/icon'
import { CATEGORY_ICONS } from './category-tile.constants'
import type { CategoryTileProps } from './category-tile.types'

/** A category's solid color tile with its icon. */
const CategoryTile = (props: CategoryTileProps) => {
	const { category, size = 28 } = props

	return (
		<span
			className="category-tile"
			style={{ width: size, height: size, background: `var(--cat-${category})` }}
			aria-hidden="true"
		>
			<Icon name={CATEGORY_ICONS[category]} size={Math.round(size * 0.6)} />
		</span>
	)
}

export default memo(CategoryTile)
