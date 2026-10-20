/**
 * `pnpm crawl <url>`: crawls a site from the terminal and prints the issues it found.
 *
 * Usage:
 *   pnpm crawl example.com              up to 50 pages
 *   pnpm crawl example.com --pages 200  up to 200 pages (500 at most)
 *   pnpm crawl example.com --json       the full crawl as JSON
 */
import pc from 'picocolors'
import { AuditError } from '@server/audit'
import { runCrawl } from '@server/crawl'
import { CRAWL_ISSUES } from '@shared/crawl-issues'
import type { CrawlReport, Priority } from '@shared/types'

const TONE: Record<Priority, (text: string) => string> = {
	high: pc.red,
	medium: pc.yellow,
	low: pc.dim
}

function printCrawl(report: CrawlReport): void {
	console.log('')
	console.log(
		`${pc.bold(report.startUrl)}  ${pc.dim(`${(report.durationMs / 1000).toFixed(1)} s`)}`
	)
	console.log(
		`${pc.bold(`${report.pages.length} pages`)} · site health ${pc.bold(`${report.health}%`)}`
	)
	if (report.limitReached) console.log(pc.dim(`Stopped at the ${report.maxPages}-page limit.`))
	console.log('')
	for (const issue of report.issues) {
		console.log(
			`  ${TONE[issue.priority]('●')} ${issue.title.padEnd(36)} ${pc.dim(String(issue.count))}`
		)
		console.log(pc.dim(`      ${CRAWL_ISSUES[issue.id].fix}`))
	}
	console.log('')
}

async function main(): Promise<void> {
	const args = process.argv.slice(2)
	const url = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--pages')
	if (!url) {
		console.error('Usage: pnpm crawl <url> [--pages 50] [--json]')
		process.exitCode = 1

		return
	}
	const pagesFlag = args.indexOf('--pages')
	const maxPages = pagesFlag === -1 ? 50 : Number(args[pagesFlag + 1]) || 50
	const json = args.includes('--json')
	try {
		const report = await runCrawl(url, {
			maxPages,
			onProgress: (p) => {
				if (!json)
					process.stderr.write(pc.dim(`  ${String(p.pct).padStart(3)}%  ${p.label}\n`))
			}
		})
		if (json) console.log(JSON.stringify(report, null, '\t'))
		else printCrawl(report)
	} catch (e) {
		console.error(pc.red(e instanceof AuditError ? e.message : String(e)))
		process.exitCode = 1
	}
}

main()
