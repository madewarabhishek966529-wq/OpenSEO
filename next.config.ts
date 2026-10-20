import type { NextConfig } from 'next'
import pkg from './package.json'

const nextConfig: NextConfig = {
	output: 'standalone',
	poweredByHeader: false,
	env: { OPENSEO_VERSION: pkg.version },
	async headers() {
		return [
			{
				// Pages may only be framed by OpenSEO itself.
				source: '/(.*)',
				headers: [
					{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
				]
			}
		]
	}
}

export default nextConfig
