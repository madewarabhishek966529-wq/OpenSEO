import nodemailer from 'nodemailer'
import { toHtml, toText, type AlertMessage } from './message'

let transport: ReturnType<typeof nodemailer.createTransport> | undefined
let transportUrl = ''

/** SMTP_URL is set, so alerts can go out by email. */
export function emailReady(): boolean {
	return Boolean(process.env.SMTP_URL)
}

/**
 * Who emails come from: SMTP_FROM, or the SMTP user when it's an address. Most providers
 * only accept mail from addresses they've verified, so set SMTP_FROM to one of those.
 */
export function sender(smtpUrl: string, from = process.env.SMTP_FROM): string {
	if (from) return from
	let user = ''
	try {
		user = decodeURIComponent(new URL(smtpUrl).username)
	} catch {
		// an unreadable URL fails when sending, with nodemailer's message
	}

	return user.includes('@') ? `OpenSEO <${user}>` : 'OpenSEO <openseo@localhost>'
}

function transporter(url: string) {
	if (!transport || transportUrl !== url) {
		transport = nodemailer.createTransport({
			url,
			connectionTimeout: 15_000,
			greetingTimeout: 15_000,
			socketTimeout: 30_000
		})
		transportUrl = url
	}

	return transport
}

/** Sends an alert to everyone on the list, through the SMTP server in SMTP_URL. */
export async function sendEmail(to: string[], message: AlertMessage): Promise<void> {
	const url = process.env.SMTP_URL
	if (!url) throw new Error("SMTP_URL isn't set, so OpenSEO can't send email.")
	await transporter(url).sendMail({
		from: sender(url),
		to: to.join(', '),
		subject: message.title,
		text: toText(message),
		html: toHtml(message)
	})
}
