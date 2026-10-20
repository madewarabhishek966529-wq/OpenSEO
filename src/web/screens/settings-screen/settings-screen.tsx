'use client'

import { memo, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
	BROKEN_LINK_OPTIONS,
	CRAWL_PAGE_OPTIONS,
	type PublicSettings,
	type Settings
} from '@shared/settings'
import { Icon } from '@web/components/icon'
import { PageHeader } from '@web/components/page-header'
import { AppUrlField } from './components/app-url-field'
import { EmailsField } from './components/emails-field'
import { Row } from './components/row'
import { SecretField } from './components/secret-field'
import { Section } from './components/section'
import { SettingSelect } from './components/setting-select'
import { SettingToggle } from './components/setting-toggle'
import { TestAlert } from './components/test-alert'
import { ThemeOption } from './components/theme-option'
import { THEMES } from './settings-screen.constants'
import type { SettingsScreenProps } from './settings-screen.types'

/** Appearance, audit options and where alerts go. Every change saves straight away. */
const SettingsScreen = (props: SettingsScreenProps) => {
	const { settings: initial, version } = props

	const router = useRouter()
	const [settings, setSettings] = useState<PublicSettings>(initial)
	const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

	const update = useCallback(
		async (patch: Partial<Settings>) => {
			setStatus('saving')
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(patch)
			})
			if (!res.ok) {
				setStatus('error')

				return
			}
			setSettings(await res.json())
			setStatus('saved')
			router.refresh()
		},
		[router]
	)

	return (
		<div className="screen settings">
			<PageHeader
				eyebrow="Workspace"
				title="Settings"
				description="Changes save as you make them."
				actions={
					status !== 'idle' && (
						<span className={`save-status is-${status}`} role="status">
							{status === 'saving' && 'Saving…'}
							{status === 'saved' && (
								<>
									<Icon name="check" size={14} /> Saved
								</>
							)}
							{status === 'error' && "Couldn't save. Try again."}
						</span>
					)
				}
			/>

			<Section title="Appearance">
				<Row label="Theme" note="Applies to the app and shared reports.">
					<div className="segmented" role="radiogroup" aria-label="Theme">
						{THEMES.map((t) => (
							<ThemeOption
								key={t.value}
								value={t.value}
								label={t.label}
								checked={settings.theme === t.value}
								onSelect={(theme) => update({ theme })}
							/>
						))}
					</div>
				</Row>
			</Section>

			<Section title="Audits">
				<Row
					label="Core Web Vitals"
					note="Runs Google PageSpeed Insights for real-browser speed scores and screenshots. Adds about 20 seconds."
					htmlFor="s-pagespeed"
				>
					<SettingToggle
						id="s-pagespeed"
						setting="pagespeedEnabled"
						settings={settings}
						onChange={update}
					/>
				</Row>
				<Row
					label="PageSpeed API key"
					note="Free from Google Cloud. Without one, Google often turns requests away."
					htmlFor="s-key"
				>
					<SecretField
						id="s-key"
						setting="pagespeedApiKey"
						isSet={settings.hasPagespeedKey}
						fromEnv={settings.pagespeedKeyFromEnv ? 'PAGESPEED_API_KEY' : undefined}
						placeholder="Paste your API key"
						onChange={update}
					/>
				</Row>
				<Row
					label="Links to check per audit"
					note="Each one is a request to the linked site."
					htmlFor="s-links"
				>
					<SettingSelect
						id="s-links"
						setting="brokenLinkLimit"
						options={BROKEN_LINK_OPTIONS}
						settings={settings}
						onChange={update}
					/>
				</Row>
				<Row label="Most pages per crawl" htmlFor="s-crawl">
					<SettingSelect
						id="s-crawl"
						setting="crawlPageLimit"
						options={CRAWL_PAGE_OPTIONS}
						settings={settings}
						onChange={update}
					/>
				</Row>
			</Section>

			<Section
				id="alerts"
				title="Alerts"
				description="Where monitors send alerts. Each alert goes to every channel set up here."
			>
				<Row
					label="Email"
					note={
						settings.emailReady
							? 'Separate addresses with commas.'
							: 'Email needs SMTP_URL to be set; see the README. Addresses saved now are used once it is.'
					}
					htmlFor="s-emails"
				>
					<EmailsField id="s-emails" emails={settings.alertEmails} onChange={update} />
				</Row>
				<Row label="Slack" note="An incoming webhook from a Slack app." htmlFor="s-slack">
					<SecretField
						id="s-slack"
						setting="slackWebhookUrl"
						isSet={settings.hasSlackWebhook}
						placeholder="https://hooks.slack.com/services/…"
						onChange={update}
					/>
				</Row>
				<Row
					label="Discord"
					note="In the channel's settings, under Integrations, then Webhooks."
					htmlFor="s-discord"
				>
					<SecretField
						id="s-discord"
						setting="discordWebhookUrl"
						isSet={settings.hasDiscordWebhook}
						placeholder="https://discord.com/api/webhooks/…"
						onChange={update}
					/>
				</Row>
				<Row
					label="Webhook"
					note="Gets every alert as JSON, for Zapier, n8n, Make or your own code."
					htmlFor="s-webhook"
				>
					<SecretField
						id="s-webhook"
						setting="webhookUrl"
						isSet={settings.hasWebhook}
						placeholder="https://"
						onChange={update}
					/>
				</Row>
				<Row
					label="Links in alerts"
					note="The address you open OpenSEO at, so links in alerts work. Empty means http://localhost:3000."
					htmlFor="s-app-url"
				>
					<AppUrlField id="s-app-url" value={settings.appUrl} onChange={update} />
				</Row>
				<Row label="Try it" note="Sends a test alert to every channel above.">
					<TestAlert
						ready={
							settings.alertEmails.length > 0 ||
							settings.hasSlackWebhook ||
							settings.hasDiscordWebhook ||
							settings.hasWebhook
						}
					/>
				</Row>
			</Section>

			<Section title="About">
				<Row
					label={`OpenSEO ${version}`}
					note="Free and open source under the MIT license. Reports, crawls and settings are JSON files in the data folder."
				>
					<a
						className="button"
						href="https://github.com/alexsilver8/open-seo"
						target="_blank"
						rel="noreferrer"
					>
						<Icon name="code" size={15} />
						Source code
					</a>
				</Row>
			</Section>
		</div>
	)
}

export default memo(SettingsScreen)
