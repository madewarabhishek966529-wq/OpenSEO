'use client'

import { memo, useState } from 'react'
import { Button } from '@web/components/button'
import { Input } from '@web/components/input'
import type { SecretFieldProps } from './secret-field.types'
import { problemWith } from './secret-field.utils'

/** A key or webhook address. Secrets are never sent back to the browser, so this only replaces or removes one. */
const SecretField = (props: SecretFieldProps) => {
	const { id, setting, isSet, fromEnv, placeholder, onChange } = props

	const [draft, setDraft] = useState('')
	const [error, setError] = useState<string | null>(null)

	const handleBlur = () => {
		const value = draft.trim()
		if (!value) return
		const problem = problemWith(setting, value)
		setError(problem)
		if (problem) return
		onChange({ [setting]: value })
		setDraft('')
	}

	if (fromEnv) return <span className="muted">Set by {fromEnv}</span>

	return (
		<div className="field-pair">
			<div className="field-pair field-pair--tight">
				<Input
					id={id}
					type="password"
					autoComplete="off"
					spellCheck={false}
					placeholder={isSet ? 'Saved. Type to replace it' : placeholder}
					value={draft}
					aria-invalid={error !== null}
					onChange={(e) => setDraft(e.currentTarget.value)}
					onBlur={handleBlur}
				/>
				{isSet && (
					<Button variant="danger-quiet" onClick={() => onChange({ [setting]: '' })}>
						Remove
					</Button>
				)}
			</div>
			{error && (
				<span className="field-error" role="alert">
					{error}
				</span>
			)}
		</div>
	)
}

export default memo(SecretField)
