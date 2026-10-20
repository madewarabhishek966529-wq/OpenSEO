# Contributing to OpenSEO

Thanks for helping. Bug reports, new checks, fixes and features are all welcome.

## Getting set up

You need Node.js 22.12 or newer and pnpm 12 (`npm install -g pnpm`).

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the app with hot reload on http://localhost:3000. Set
`OPENSEO_DATA_DIR=/some/folder` to keep development reports separate from your real ones, and
`OPENSEO_ALLOW_PRIVATE=true` to audit a site running on your own machine.

To try the engine without the UI, `pnpm scan example.com --all` prints every check.
`pnpm check <url> --baseline <url>` runs what the GitHub Action (`action.yml`) runs.

## Before opening a pull request

```bash
pnpm typecheck
pnpm test
pnpm format
pnpm cleaner
```

`pnpm cleaner` checks the conventions below that Prettier and TypeScript don't, and tells you
how to fix anything it finds. Right now it checks that component files declare no interfaces or
types.

- Keep pull requests focused: one fix or feature each.
- Add or update tests in `tests/` when you change a check, scoring, the crawler, robots.txt
  parsing or settings.
- When you change a check, run `pnpm scan` against a few real sites and say which in the pull
  request.
- Code follows the code style and component layout below.
- UI copy is sentence case and says what things do ("Run the audit again", not "Submit"). Check
  summaries say what we found; recommendations say what to do.

## Code style

- Indent with tabs, shown 4 wide. YAML can't use tabs, so it uses 4 spaces. `pnpm format`
  (Prettier) takes care of this.
- Leave a blank line above every `return` that isn't the first statement in its block, including
  inside `if` blocks, `case`s and callbacks. A comment directly above the `return` stays with it,
  and the blank line goes above the comment.
- Imports from outside the current folder use an alias, never `../`: `@web/…` for `src/web`,
  `@server/…` for `src/server` and `@shared/…` for `src/shared`. Use `./` only for files in the
  same folder or below it.
- Don't use the `void` operator. Call a function whose result you don't need as a plain
  statement (`load()`), and give an arrow function that shouldn't return anything a block body
  (`() => { load() }`).

## Where code lives

| Folder       | Holds                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| `src/app`    | Next.js routes. Pages load data on the server and render one screen; nothing else   |
| `src/web`    | Everything React: `components/` used in several places, `screens/` one per page     |
| `src/server` | Code that only runs on the server: the audit engine, crawler, store and rate limits |
| `src/shared` | Types and helpers both sides use: grades, settings, formatting                      |

Server code never imports from `src/web`, and `src/web` only imports types and pure helpers from
`src/shared`, never `src/server`.

## Component layout

Every React component in `src/web` has its own folder, named after it in kebab-case:

```
check-row/
├── check-row.tsx            the component (CheckRow), and nothing else
├── check-row.types.ts       its types: props (CheckRowProps) and any others
├── check-row.constants.ts   constants it uses
├── check-row.utils.ts       helper functions it uses
├── index.ts                 exports the component, plus anything other folders need
└── components/              components only CheckRow uses, each laid out the same way
    └── detail-block/
```

A component is an arrow function that takes `props` and destructures it on its first line, and
it's default-exported wrapped in `memo`, even when it doesn't need memoizing:

```tsx
const CheckRow = (props: CheckRowProps) => {
	const { check } = props

	// …
}

export default memo(CheckRow)
```

- Folder and file names are kebab-case (`report-top-bar/report-top-bar.tsx`); the component
  itself keeps its PascalCase name (`ReportTopBar`).
- One component per file, and its file exports only that component.
- Props are read through that one `const { … } = props` line, followed by a blank line: no
  destructuring in the parameter list and no `props.x`. Defaults go in the destructure
  (`const { size = 16 } = props`).
- The folder's `index.ts` re-exports it by name (`export { default as CheckRow } from './check-row'`),
  so other files import `{ CheckRow }`.
- A component that uses state, effects or browser APIs starts with `'use client'`. Screens and
  components that only render props stay server components.
- `memo` skips re-renders when props haven't changed, so read outside values (the time,
  `window`, …) in effects and event handlers, or pass them in as props, rather than while
  rendering. Pages pass `now` down for "5 min ago" labels.
- A small handler, one expression, goes straight in the prop:
  `onClick={() => setConfirming(false)}`. Anything bigger is a named `handle…` function declared
  in the component body above the JSX that uses it, like `onClick={handleCopyClick}`: more than
  one statement, an `if`, or a handler several props share. A function written in a prop never
  has a `{ … }` body.
- Type a named handler's event with React's event type for that element, such as
  `MouseEvent<HTMLButtonElement>`, `ChangeEvent<HTMLInputElement>` or
  `SubmitEvent<HTMLFormElement>`, and read the element through `e.currentTarget`. Inline handlers
  are typed by their prop. Never use `FormEvent`, which React's types deprecate.
- When an item rendered in a `.map()` has handlers of its own, make it a sub-component (like
  `FilterTab` in `report-checks/components/`).
- Don't write near-duplicate handlers. When several controls differ only in which value they
  change, make a component that takes the key instead: settings switches are
  `<SettingToggle setting="pagespeedEnabled" … />`, not one `handle…Change` per setting.
- Every type a component needs goes in `<name>.types.ts`: its props as `<Name>Props`, the types
  of its props and any others, like the shape of a piece of state. The component file itself
  declares no interfaces or types. A component with no types has no types file.
- Top-level constants go in `<name>.constants.ts` (`.tsx` if they contain JSX), and helper
  functions in `<name>.utils.ts`. Leave out the files a component doesn't need.
- A component used only by one parent lives in that parent's `components/` folder. Components
  used in several places live in `src/web/components/`.
- Import a component's folder (`'./components/check-row'`), not the files inside it.

### Shared components

Use these from `@web/components` rather than styling the HTML element yourself.

`Button`, like `<Button variant="primary" onClick={save}>Save</Button>`, is `type="button"`
unless you pass `type="submit"`, so it never submits a form by accident. Add `small` for the
compact size. It takes an extra `className` and passes everything else to the `<button>`:

| `variant`      | Use it for                                    |
| -------------- | --------------------------------------------- |
| `default`      | Most actions (outlined)                       |
| `primary`      | The main action in a form or panel (ink)      |
| `accent`       | Calls to action on reports (brand color)      |
| `quiet`        | Secondary actions like Cancel (no border)     |
| `danger`       | A destructive action the person has confirmed |
| `danger-quiet` | A destructive action before it's confirmed    |
| `icon`         | An icon-only button; give it an `aria-label`  |

For a link that looks like a button, use `<a className="button …">` with the same classes.

`Input` is a text field: `<Input value={url} onChange={…} />`. `Icon` draws one of the
hand-drawn 20×20 icons in `icon.constants.tsx`; add new ones there rather than adding an icon
library.

`GradeRing`, `ScoreBar`, `StatusMark` and `CategoryTile` show scores, results and categories the
same way everywhere. Status colors always come with an icon or label, never color alone.

## Adding a check

Checks live in `src/server/audit/checks/`, one file per category. A check is a function that
takes the `AuditContext` and returns a `CheckResult`:

- `weight` is how much it counts within its category (0 for information only), and `priority`
  how urgent it is when it fails. Most checks weigh 0.5–3.
- Pass and fail thresholds should match what search engines and Lighthouse document, not
  taste. Say where a threshold comes from in a comment if it isn't obvious.
- A check that isn't passing always has a `recommendation`.
- `details` carry the evidence: the tag found, the files that are too big, the broken links.
- If it needs another request, add it to `gather.ts` so it runs in parallel with the rest.

Add a case to `tests/checks.test.ts` with a small HTML fixture.

## Commits and pull requests

`main` is protected: every change goes through a pull request, and two checks must pass before
it can merge:

- `ci`: the cleaner, type check, build and tests, on Node 22 and 24
- `pr-title`: the pull request title follows the format below

Pull requests are squash-merged, and the title becomes the commit message on `main`, so the title
matters more than the commits on your branch. Releases are built from these titles too: they pick
the next version and become the changelog. Titles follow
[Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <summary>
```

| Example                                      | When                                   |
| -------------------------------------------- | -------------------------------------- |
| `feat(report): add a cover page to PDFs`     | A new feature (the next minor version) |
| `fix(crawler): stop at the page limit`       | A bug fix (the next patch version)     |
| `perf(audit): fetch the sitemap in parallel` | Faster, same behavior                  |
| `docs: explain share previews`               | Documentation                          |
| `refactor(store): split crawls from reports` | Code change, same behavior             |
| `test(checks): cover hreflang`               | Tests                                  |
| `style: format the crawler with Prettier`    | Formatting only                        |
| `chore: switch from npm to pnpm`             | Tooling and config                     |

Start the summary with a lowercase letter; the check rejects titles that don't. The scope is
optional; use the area you touched (`audit`, `checks`, `crawler`, `report`, `compare`,
`monitors`, `action`, `mcp`, `share`, `settings`, `api`, `ci`). Add `!` after the type or scope for a breaking change
(`feat(api)!: …`).

## Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please). It
reads the Conventional Commit titles merged into `main` and keeps a release pull request open
that bumps the version in `package.json` and adds the notes to `CHANGELOG.md`; edit the notes in
that pull request if they need it. Merging it tags the release, publishes a GitHub release and
pushes the Docker image to `ghcr.io/alexsilver8/open-seo` for Intel and ARM, tagged `latest`, the
version (`0.2.0`) and the minor line (`0.2`). See `.github/workflows/release.yml`.
