import { memo } from 'react'
import { Icon } from '@web/components/icon'
import { PreviewImage } from '@web/components/share-previews/components/preview-image'
import type { PreviewFrameProps } from './preview-frame.types'

/** A lookalike of the platform's link preview, drawn from the same tags it reads. */
const PreviewFrame = (props: PreviewFrameProps) => {
	const { preview } = props

	const { title, description, siteName, domain, displayUrl, image, layout, icon, accent } =
		preview
	const hasImage = layout !== 'none'

	switch (preview.platform) {
		case 'google':
			return (
				<div className="mock mock-google">
					<span className="mock-google-site">
						<span className="mock-google-favicon">
							{icon ? <PreviewImage src={icon} /> : <Icon name="globe" size={14} />}
						</span>
						<span className="mock-google-names">
							<span className="mock-google-name">{siteName}</span>
							<span className="mock-google-url">{displayUrl}</span>
						</span>
					</span>
					<span className="mock-google-title mock-clamp-2">{title}</span>
					{description && <span className="mock-google-description">{description}</span>}
				</div>
			)
		case 'facebook':
			return (
				<div className={`mock mock-facebook is-${layout}`}>
					{hasImage && <PreviewImage className="mock-image" src={image} />}
					<span className="mock-facebook-text">
						<span className="mock-facebook-domain">{domain}</span>
						<strong className="mock-clamp-2">{title}</strong>
						{description && <span className="mock-clamp-1">{description}</span>}
					</span>
				</div>
			)
		case 'x':
			if (layout === 'large') {
				return (
					<div className="mock mock-x is-large">
						<span className="mock-x-media">
							<PreviewImage className="mock-image" src={image} />
							<span className="mock-x-chip">{title}</span>
						</span>
						<span className="mock-x-from">From {domain}</span>
					</div>
				)
			}

			return (
				<div className="mock mock-x is-small">
					{hasImage ? (
						<PreviewImage className="mock-image" src={image} />
					) : (
						<span className="mock-image preview-image-missing">
							<Icon name="link" size={20} />
						</span>
					)}
					<span className="mock-x-text">
						<span className="mock-x-domain">{domain}</span>
						<span className="mock-clamp-2">{title}</span>
					</span>
				</div>
			)
		case 'linkedin':
			return (
				<div className={`mock mock-linkedin is-${layout}`}>
					{hasImage && <PreviewImage className="mock-image" src={image} />}
					<span className="mock-linkedin-text">
						<strong className="mock-clamp-2">{title}</strong>
						<span className="mock-linkedin-domain">{domain}</span>
					</span>
				</div>
			)
		case 'slack':
			return (
				<div className="mock mock-slack">
					<span className="mock-slack-body">
						<span className="mock-slack-site">
							{icon && <PreviewImage className="mock-slack-icon" src={icon} />}
							{siteName}
						</span>
						<span className="mock-slack-title">{title}</span>
						{description && (
							<span className="mock-slack-description mock-clamp-3">
								{description}
							</span>
						)}
						{layout === 'large' && (
							<PreviewImage className="mock-image mock-slack-image" src={image} />
						)}
					</span>
					{layout === 'small' && (
						<PreviewImage className="mock-image mock-slack-thumb" src={image} />
					)}
				</div>
			)
		case 'discord':
			return (
				<div
					className="mock mock-discord"
					style={accent ? { borderLeftColor: accent } : undefined}
				>
					<span className="mock-discord-body">
						{siteName && <span className="mock-discord-site">{siteName}</span>}
						<span className="mock-discord-title">{title}</span>
						{description && (
							<span className="mock-discord-description mock-clamp-3">
								{description}
							</span>
						)}
						{layout === 'large' && (
							<PreviewImage className="mock-image mock-discord-image" src={image} />
						)}
					</span>
					{layout === 'small' && (
						<PreviewImage className="mock-image mock-discord-thumb" src={image} />
					)}
				</div>
			)
		case 'whatsapp':
			return (
				<div className="mock mock-whatsapp">
					<span className={`mock-whatsapp-card is-${layout}`}>
						{hasImage && <PreviewImage className="mock-image" src={image} />}
						<span className="mock-whatsapp-text">
							<strong className="mock-clamp-2">{title}</strong>
							{description && <span className="mock-clamp-2">{description}</span>}
							<span className="mock-whatsapp-domain">{domain}</span>
						</span>
					</span>
					<span className="mock-whatsapp-link">{displayUrl}</span>
				</div>
			)
		case 'telegram':
			return (
				<div className={`mock mock-telegram is-${layout}`}>
					<div className="mock-telegram-header">
						<span className="mock-telegram-heading">
							<span className="mock-telegram-dot" />
							<strong>Telegram</strong>
						</span>
						<span className="mock-telegram-kind">Chat message</span>
					</div>

					<div className="mock-telegram-body">
						<div className="mock-telegram-card">
							<span className="mock-telegram-domain">{domain}</span>

							<div className="mock-telegram-content">
								<div className="mock-telegram-copy">
									{siteName && (
										<strong className="mock-telegram-site">{siteName}</strong>
									)}
									<strong className="mock-clamp-2">{title}</strong>
									{description && (
										<span className="mock-clamp-3">{description}</span>
									)}
								</div>

								{layout === 'small' && hasImage && (
									<PreviewImage
										className="mock-image mock-telegram-thumb"
										src={image}
									/>
								)}
							</div>

							{layout === 'large' && hasImage && (
								<PreviewImage
									className="mock-image mock-telegram-image"
									src={image}
								/>
							)}
						</div>
					</div>
				</div>
			)
		case 'imessage':
			return (
				<div className={`mock mock-imessage is-${layout}`}>
					{hasImage && <PreviewImage className="mock-image" src={image} />}
					<span className="mock-imessage-footer">
						<span className="mock-imessage-text">
							<strong className="mock-clamp-2">{title}</strong>
							<span>{domain}</span>
						</span>
						{!hasImage &&
							(icon ? (
								<PreviewImage className="mock-imessage-icon" src={icon} />
							) : (
								<span className="mock-imessage-icon preview-image-missing">
									<Icon name="globe" size={18} />
								</span>
							))}
					</span>
				</div>
			)
		default:
			return null
	}
}

export default memo(PreviewFrame)
