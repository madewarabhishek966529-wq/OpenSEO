import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		alias: {
			'@server': resolve(__dirname, 'src/server'),
			'@shared': resolve(__dirname, 'src/shared'),
			'@web': resolve(__dirname, 'src/web')
		}
	},
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node'
	}
})
