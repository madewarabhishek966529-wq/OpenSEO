import { memo } from 'react'
import Link from 'next/link'
import { formatList } from '@shared/format'
import { alertTargetNames } from '@shared/monitors'
import { Icon } from '@web/components/icon'
import type { AlertTargetsNoteProps } from './alert-targets-note.types'

/** Where alerts go, set in Settings, or a nudge to set it up. */
const AlertTargetsNote = (props: AlertTargetsNoteProps) => {
	const { targets } = props

	const names = alertTargetNames(targets)
	const emailBlocked = targets.emails.length > 0 && !targets.emailReady

	return (
		<p className={`callout${names.length ? '' : ' callout--warn'}`}>
			<Icon name="bell" size={16} />
			<span>
				{names.length
					? `Alerts go to ${formatList(names)}. `
					: 'Alerts have nowhere to go yet: add an email address, Slack, Discord or a webhook. '}
				{emailBlocked && 'Email needs SMTP_URL to be set (see the README). '}
				<Link href="/settings#alerts">
					{names.length ? 'Change in Settings' : 'Set up alerts'}
				</Link>
			</span>
		</p>
	)
}

export default memo(AlertTargetsNote)
