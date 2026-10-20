import { memo } from 'react'
import { STATUS_LABEL } from '@shared/grades'
import { Icon } from '@web/components/icon'
import { STATUS_ICONS } from './status-mark.constants'
import type { StatusMarkProps } from './status-mark.types'

/** A check's result as a tinted circle with an icon, so it never relies on color alone. */
const StatusMark = (props: StatusMarkProps) => {
	const { status, size = 22 } = props

	return (
		<span
			className={`status-mark status-mark--${status}`}
			style={{ width: size, height: size }}
		>
			<Icon name={STATUS_ICONS[status]} size={Math.round(size * 0.62)} />
			<span className="sr-only">{STATUS_LABEL[status]}</span>
		</span>
	)
}

export default memo(StatusMark)
