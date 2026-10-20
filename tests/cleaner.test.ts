import { createColors } from 'picocolors'
import { describe, expect, it } from 'vitest'
import { checkFile, formatReport, isComponentFile } from '../scripts/cleaner.mjs'

const CARD = 'src/web/screens/report-screen/components/card/card.tsx'

describe('isComponentFile', () => {
	it.each([CARD, 'src/web/components/icon/icon.tsx'])('counts %s', (path) => {
		expect(isComponentFile(path)).toBe(true)
	})

	it.each([
		'src/web/screens/report-screen/components/card/card.types.ts',
		'src/web/screens/report-screen/components/card/card.utils.ts',
		'src/web/components/icon/icon.constants.tsx',
		'src/web/screens/report-screen/components/card/index.ts',
		'src/app/layout.tsx',
		'src/app/report/[id]/page.tsx'
	])('skips %s', (path) => {
		expect(isComponentFile(path)).toBe(false)
	})
})

describe('no-types-in-components', () => {
	it('flags interfaces and types anywhere in a component file', () => {
		const source = [
			"import type { CardProps } from './card.types'",
			'',
			'interface Hover {',
			'	x: number',
			'}',
			'',
			'const Card = (props: CardProps) => {',
			"	type Mode = 'a' | 'b'",
			'',
			'	return null',
			'}'
		].join('\n')

		expect(checkFile(CARD, source)).toEqual([
			expect.objectContaining({ line: 3, column: 1, rule: 'no-types-in-components' }),
			expect.objectContaining({ line: 8, column: 2, rule: 'no-types-in-components' })
		])
		expect(checkFile(CARD, source).map((p) => p.message)).toEqual([
			'interface Hover',
			'type Mode'
		])
	})

	it('allows type imports and inline type annotations', () => {
		const source = [
			"import { memo, useState, type MouseEvent } from 'react'",
			"import type { CardProps } from './card.types'",
			'',
			'const Card = (props: CardProps) => {',
			'	const [hover, setHover] = useState<{ x: number } | null>(null)',
			'	const onMove = (e: MouseEvent<HTMLDivElement>) => setHover({ x: e.clientX } as { x: number })',
			'',
			'	return <div onMouseMove={onMove}>{hover?.x}</div>',
			'}',
			'',
			'export default memo(Card)'
		].join('\n')

		expect(checkFile(CARD, source)).toEqual([])
	})

	it('leaves types files alone', () => {
		const source = 'export interface CardProps {\n\tselected: boolean\n}\n'

		expect(checkFile(CARD.replace('card.tsx', 'card.types.ts'), source)).toEqual([])
	})
})

describe('formatReport', () => {
	const plain = createColors(false)

	it('groups problems by file and explains each rule once', () => {
		const problems = [
			{
				path: 'a/a.tsx',
				line: 3,
				column: 1,
				rule: 'no-types-in-components',
				message: 'interface Hover'
			},
			{
				path: 'a/a.tsx',
				line: 12,
				column: 2,
				rule: 'no-types-in-components',
				message: 'type Mode'
			},
			{
				path: 'b/b.tsx',
				line: 7,
				column: 1,
				rule: 'no-types-in-components',
				message: 'type Size'
			}
		]

		expect(formatReport(problems, 40, plain)).toBe(
			[
				'',
				'a/a.tsx',
				'  3:1   ✖  interface Hover  no-types-in-components',
				'  12:2  ✖  type Mode        no-types-in-components',
				'',
				'b/b.tsx',
				'  7:1  ✖  type Size  no-types-in-components',
				'',
				'no-types-in-components',
				"  Component files can't declare interfaces or types.",
				'  Move them to <name>.types.ts, next to the component.',
				'',
				'✖ 3 problems in 2 files (40 files checked)'
			].join('\n')
		)
	})

	it('says so when there are no problems', () => {
		expect(formatReport([], 1, plain)).toBe('✔ No problems in 1 file.')
	})
})
