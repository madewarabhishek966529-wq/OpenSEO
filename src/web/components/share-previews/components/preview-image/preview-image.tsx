'use client'

import { memo, useState } from 'react'
import { Icon } from '@web/components/icon'
import type { PreviewImageProps } from './preview-image.types'

/** An image from the checked site, with a placeholder when it's missing or won't load here. */
const PreviewImage = (props: PreviewImageProps) => {
	const { src, className = '' } = props

	const [failedSrc, setFailedSrc] = useState<string | null>(null)

	if (!src || failedSrc === src) {
		return (
			<span className={`${className} preview-image-missing`}>
				<Icon name="image" size={18} />
			</span>
		)
	}

	return (
		// The image is hosted by the checked site, so it can't go through next/image.
		<img
			className={className}
			src={src}
			alt=""
			loading="lazy"
			referrerPolicy="no-referrer"
			onError={() => setFailedSrc(src)}
		/>
	)
}

export default memo(PreviewImage)
