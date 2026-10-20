export interface HeaderItem {
	name: string
	value: string
	isSecurity?: boolean
}

export interface InspectResult {
	finalUrl: string
	status: number
	statusText: string
	totalMs: number
	ttfbMs: number
	contentType: string
	isHttps: boolean
	protocol: string
	redirectHops: { url: string; status: number }[]
	headers: HeaderItem[]
	securityScore: number
}
