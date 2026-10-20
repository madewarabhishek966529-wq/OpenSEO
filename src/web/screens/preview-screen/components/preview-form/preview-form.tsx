'use client'

import { memo, useState, type SubmitEvent } from 'react'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import type { PreviewFormProps } from './preview-form.types'

const PreviewForm = (props: PreviewFormProps) => {
	const { initialUrl, pending, onCheck } = props

	const [url, setUrl] = useState(initialUrl)

	const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (url.trim() && !pending) onCheck(url.trim())
	}

	return (
		<form className="panel-form" onSubmit={handleSubmit}>
			<div className="panel-form-row">
				<label className="composer-field panel-form-url">
					<Icon name="link" size={18} />
					<span className="sr-only">Page address</span>
					<input
						type="text"
						inputMode="url"
						spellCheck={false}
						placeholder="yourwebsite.com/blog/a-post"
						value={url}
						onChange={(e) => setUrl(e.currentTarget.value)}
					/>
				</label>
				<Button type="submit" variant="primary" disabled={!url.trim() || pending}>
					{pending ? 'Checking…' : 'Preview link'}
				</Button>
			</div>
		</form>
	)
}

export default memo(PreviewForm)
