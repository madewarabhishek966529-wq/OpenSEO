'use client'

import { memo, useState } from 'react'
import { Button } from '@web/components/button'
import { Input } from '@web/components/input'
import type { AppUrlFieldProps } from './app-url-field.types'
import { isWebAddress } from './app-url-field.utils'

/** Where links in alerts point. One click fills in the address this page is open at. */
const AppUrlField = (props: AppUrlFieldProps) => {
	const { id, value, onChange } = props

	const [draft, setDraft] = useState(value)
	const [error, setError] = useState<string | null>(null)

	const save = (next: string) => {
		const address = next.trim().replace(/\/+$/, '')
		if (!isWebAddress(address)) {
			setError('Enter a full address, like https://seo.example.com.')

			return
		}
		setError(null)
		setDraft(address)
		if (address !== value) onChange({ appUrl: address })
	}

	const handleUseThisClick = () => {
		save(window.location.origin)
	}

	return (
		<div className="field-pair">
			<div className="field-pair field-pair--tight">
				<Input
					id={id}
					type="url"
					spellCheck={false}
					placeholder="http://localhost:3000"
					value={draft}
					aria-invalid={error !== null}
					onChange={(e) => setDraft(e.currentTarget.value)}
					onBlur={() => save(draft)}
				/>
				<Button onClick={handleUseThisClick}>Use this address</Button>
			</div>
			{error && (
				<span className="field-error" role="alert">
					{error}
				</span>
			)}
		</div>
	)
}

export default memo(AppUrlField)
