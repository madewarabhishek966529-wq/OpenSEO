'use client'

import { memo, useState } from 'react'
import { parseEmails } from '@shared/settings'
import { Input } from '@web/components/input'
import type { EmailsFieldProps } from './emails-field.types'
import { invalidMessage } from './emails-field.utils'

/** The addresses alerts are emailed to, separated by commas. Saves when you leave the field. */
const EmailsField = (props: EmailsFieldProps) => {
	const { id, emails, onChange } = props

	const [draft, setDraft] = useState(emails.join(', '))
	const [error, setError] = useState<string | null>(null)

	const handleBlur = () => {
		const { emails: parsed, invalid } = parseEmails(draft)
		if (invalid.length) {
			setError(invalidMessage(invalid))

			return
		}
		setError(null)
		setDraft(parsed.join(', '))
		if (parsed.join() !== emails.join()) onChange({ alertEmails: parsed })
	}

	return (
		<div className="field-pair">
			<Input
				id={id}
				type="text"
				inputMode="email"
				autoComplete="off"
				spellCheck={false}
				placeholder="you@example.com, team@example.com"
				value={draft}
				aria-invalid={error !== null}
				onChange={(e) => setDraft(e.currentTarget.value)}
				onBlur={handleBlur}
			/>
			{error && (
				<span className="field-error" role="alert">
					{error}
				</span>
			)}
		</div>
	)
}

export default memo(EmailsField)
