/**
 * `pnpm cleaner`: checks the code against the conventions in CONTRIBUTING.md that Prettier and
 * TypeScript don't enforce.
 *
 * Each rule picks the files it applies to and reports what breaks the convention. Problems are
 * listed under their file, and each rule that found something explains itself and its fix once,
 * at the end. The command exits with an error when it finds anything.
 *
 * Usage:
 *   pnpm cleaner             check every file in src/web
 *   pnpm cleaner <file>...   check only these files
 */
import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import pc from 'picocolors'
import ts from 'typescript'

/** Where the React components live. */
export const WEB = 'src/web'

/** A component file is named after its folder, like `card/card.tsx`. */
export function isComponentFile(path) {
	return path.endsWith('.tsx') && basename(path, '.tsx') === basename(dirname(path))
}

/**
 * The conventions to check. Each rule has an id, a one-line description and fix (shown once per
 * run), the files it applies to, and a check that returns `{ node, message }` for each problem in
 * a parsed file. Keep messages short: they name what's wrong, the description explains why.
 */
export const RULES = [
	{
		id: 'no-types-in-components',
		description: "Component files can't declare interfaces or types.",
		fix: 'Move them to <name>.types.ts, next to the component.',
		appliesTo: isComponentFile,
		check(sourceFile) {
			const problems = []
			const visit = (node) => {
				if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
					const kind = ts.isInterfaceDeclaration(node) ? 'interface' : 'type'
					problems.push({ node, message: `${kind} ${node.name.text}` })
				}
				ts.forEachChild(node, visit)
			}
			visit(sourceFile)

			return problems
		}
	}
]

/**
 * Checks one file's source against every rule that applies to it.
 *
 * @param {string} path the file's path, with forward slashes
 * @param {string} text the file's contents
 * @returns {{ path: string, line: number, column: number, rule: string, message: string }[]}
 */
export function checkFile(path, text) {
	const rules = RULES.filter((rule) => rule.appliesTo(path))
	if (!rules.length) return []
	const sourceFile = ts.createSourceFile(
		path,
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX
	)

	return rules.flatMap((rule) =>
		rule.check(sourceFile, path).map(({ node, message }) => {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			)

			return { path, line: line + 1, column: character + 1, rule: rule.id, message }
		})
	)
}

/** Every file under `dir`, as paths relative to the working directory with forward slashes. */
export function listFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return listFiles(path)

		return [relative(process.cwd(), path).split(sep).join('/')]
	})
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Renders the problems as a report: each file's problems in aligned rows, then what each rule
 * that fired means and how to fix it, then a summary line.
 *
 * @param {ReturnType<typeof checkFile>} problems
 * @param {number} checked how many files were checked
 * @param {import('picocolors').Colors} colors pass `createColors(false)` for plain text
 */
export function formatReport(problems, checked, colors = pc) {
	const c = colors
	if (!problems.length) return `${c.green('✔')} No problems in ${plural(checked, 'file')}.`
	const lines = ['']
	const byFile = Map.groupBy(problems, (p) => p.path)
	for (const [path, list] of byFile) {
		const where = list.map((p) => `${p.line}:${p.column}`)
		const whereWidth = Math.max(...where.map((w) => w.length))
		const messageWidth = Math.max(...list.map((p) => p.message.length))
		lines.push(c.underline(path))
		list.forEach((p, i) => {
			lines.push(
				`  ${c.dim(where[i].padEnd(whereWidth))}  ${c.red('✖')}  ${p.message.padEnd(messageWidth)}  ${c.dim(p.rule)}`
			)
		})
		lines.push('')
	}
	for (const id of new Set(problems.map((p) => p.rule))) {
		const rule = RULES.find((r) => r.id === id)
		lines.push(c.bold(id), `  ${rule.description}`, `  ${c.dim(rule.fix)}`, '')
	}
	const files = byFile.size
	lines.push(
		c.red(c.bold(`✖ ${plural(problems.length, 'problem')} in ${plural(files, 'file')}`)) +
			c.dim(` (${plural(checked, 'file')} checked)`)
	)

	return lines.join('\n')
}

function main() {
	const args = process.argv.slice(2)
	const paths = args.length ? args.map((p) => p.split(sep).join('/')) : listFiles(WEB)
	const problems = paths.flatMap((path) => checkFile(path, readFileSync(path, 'utf8')))

	console.log(formatReport(problems, paths.length))
	if (process.env.GITHUB_ACTIONS) {
		for (const p of problems) {
			const rule = RULES.find((r) => r.id === p.rule)
			console.log(
				`::error file=${p.path},line=${p.line},col=${p.column},title=${p.rule}::${p.message}: ${rule.description} ${rule.fix}`
			)
		}
	}
	if (problems.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
