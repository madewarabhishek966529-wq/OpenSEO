'use client'

import { memo, useState } from 'react'
import { CHANNEL_NAMES, type Delivery } from '@shared/monitors'
import { Button } from '@web/components/button'
import { Icon } from '@web/components/icon'
import { StatusMark } from '@web/components/status-mark'
import type { TestAlertProps } from './test-alert.types'

/** Sends a test alert everywhere alerts go, and shows how each channel took it. */
const TestAlert = (props: TestAlertProps) => {
	const { ready } = props

	const [sending, setSending] = useState(false)
	const [deliveries, setDeliveries] = useState<Delivery[] | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleClick = async () => {
		setSending(true)
		setError(null)
		setDeliveries(null)
		const res = await fetch('/api/alerts/test', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{}'
		})
		const data = (await res.json().catch(() => ({}))) as {
			deliveries?: Delivery[]
			error?: string
		}
		if (res.ok && data.deliveries) setDeliveries(data.deliveries)
		else setError(data.error ?? `Couldn't send the test (${res.status}).`)
		setSending(false)
	}

	return (
		<div className="field-pair test-alert">
			<Button onClick={handleClick} disabled={!ready || sending}>
				<Icon name="bell" size={15} />
				{sending ? 'Sending…' : 'Send a test alert'}
			</Button>
			{deliveries && (
				<ul className="delivery-list" role="status">
					{deliveries.map((delivery) => (
						<li key={delivery.channel}>
							<StatusMark status={delivery.ok ? 'pass' : 'fail'} size={18} />
							<span>
								<strong>{CHANNEL_NAMES[delivery.channel]}</strong>
								{delivery.ok ? ' got it.' : `: ${delivery.error}`}
							</span>
						</li>
					))}
				</ul>
			)}
			{error && (
				<span className="field-error" role="alert">
					{error}
				</span>
			)}
		</div>
	)
}

export default memo(TestAlert)
