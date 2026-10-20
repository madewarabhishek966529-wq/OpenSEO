<img src="src/app/icon.svg" alt="" width="72" height="72" />

# OpenSEO

An open-source SEO audit tool you run yourself. Paste a URL and, about 15 seconds later, get a
graded report (A+ to F) across on-page SEO, performance, usability, security, links, social and
AI search readiness, with the fixes ranked by how much they matter.

No paid APIs, no account, no database to set up.

[![ci](https://github.com/madewarabhishek966529-wq/OpenSEO/actions/workflows/ci.yml/badge.svg)](https://github.com/madewarabhishek966529-wq/OpenSEO/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/github/license/madewarabhishek966529-wq/OpenSEO)](LICENSE)

```bash
# Clone the repository
git clone https://github.com/madewarabhishek966529-wq/OpenSEO.git
cd OpenSEO

# Install dependencies and start the app
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). [More ways to run it](#run-it).

![OpenSEO auditing a site, then showing how its link looks on Google, Facebook, X and more](docs/demo.gif)

OpenSEO is an independent project inspired by hosted audit tools like SEOptimer. It is not
affiliated with any of them.

## What it does

- **Audits a page with ~75 checks** in seven categories, each with its own grade, weighted into
  one overall score.
- **Tells you what to fix first**: problems are ranked by priority, and every one says how to
  fix it, with the evidence (the tags it found, the slow files, the broken links).
- **AI-Powered Fix Assistant**: one-click AI-generated fixes for failing checks (titles, meta
  descriptions, H1s, alt text, and schema) using built-in SEO heuristics or optional Google Gemini / OpenAI.
- **Interactive SEO Utilities Suite (`/tools`)**:
  - **SERP Simulator**: Google Desktop & Mobile snippet previews with pixel-width meters and rich snippets.
  - **Robots.txt Tester**: live rule parser and path access validator with RFC 9309 precedence.
  - **JSON-LD Schema Generator**: clean schema builders for Organization, LocalBusiness, FAQ, Article, and Product.
  - **HTTP & SSL Inspector**: live response headers, security headers score, redirect chain trace, and TTFB.
- **Crawls a whole site**: follows links page-by-page or discovers all URLs from `sitemap.xml` and
  sitemap indexes; flags broken pages, duplicate titles/descriptions, missing H1s, thin content, and slow pages.
- **Keeps a history** of every audit with shareable links and each site's score over time.
- **Monitors pages**: re-audits them every day or week and alerts you by email, Slack, Discord
  or webhook when the score drops, a page stops loading or its SSL certificate is about to expire.
- **Compares two audits**: the same page before and after a deploy, or your page next to a
  competitor's, with the score, each category and every check that got better or worse.
- **Exports** reports as PDF (print-ready) and JSON, and crawls as CSV.
- **White-label reports**: your name, logo, accent color, footer and a call to action button,
  set in `data/settings.json`.
- **Has an API, a CLI and a GitHub Action** that fails a pull request when its preview deploy
  scores lower than production or breaks a check.
- **Works with AI assistants**: a built-in MCP server lets Claude, Cursor and other AI tools run
  audits, read reports, compare them, crawl sites and set up monitors.
- **Checks AI search readiness**: whether ChatGPT, Claude and Perplexity can crawl and quote the
  page, llms.txt, server-rendered content and entity markup.
- **Shows how your links look when shared** on Google, Facebook, X, LinkedIn, Slack, Discord,
  WhatsApp and iMessage, following each platform's rules for image size and card type.

![The crawler](docs/crawl.png)

![Share preview](docs/share-preview.png)

## What it checks

| Category    | Weight | Checks                                                                                                                                                                                                                                                            |
| ----------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| On-page SEO |    30% | Title, meta description, search result preview, H1, heading structure, amount of content, content readability (Flesch score), keyword consistency, image alt text, canonical, indexability, robots.txt, XML sitemap, structured data, Google rich results schema, language, hreflang, analytics, readable URL, doctype, local SEO |
| Performance |    20% | Core Web Vitals (with PageSpeed Insights), server response time, download time, page size, requests, compression, HTTP/2 and HTTP/3, image optimization, caching, minification, render-blocking files, redirects, image dimensions, lazy loading, DOM size        |
| Usability   |    12% | Mobile viewport, phone and desktop screenshots, accessibility score, form labels, favicon, Apple touch icon, web app manifest, theme color, font sizes, iframes, legacy plugins, exposed emails, deprecated HTML, inline styles                                   |
| Security    |    12% | HTTPS, HTTP to HTTPS redirect, SSL certificate expiry, mixed content, HSTS, security headers, SPF and DMARC, cookie flags, server version exposure, server and IP                                                                                                 |
| Links       |    10% | Broken links (checked live), internal and external links, link text, nofollow on internal links                                                                                                                                                                   |
| Social      |     8% | Open Graph tags, share image (loads, size, shape and weight), X card, social profiles, ad pixels                                                                                                                                                                  |
| AI search   |     8% | AI crawler access in robots.txt (search and training crawlers separately), content without JavaScript, publisher markup, snippet controls, semantic HTML, llms.txt, dates                                                                                         |

Checks that pass earn their full weight, warnings half, failures nothing. Informational checks
(like the search result preview) are shown but not scored.

## Run it

OpenSEO runs directly on Node.js without requiring Docker or third-party database services.

### Requirements

- **Node.js**: `22.12` or newer
- **pnpm**: `12.10.1` (`npm install -g pnpm`)

### Development Mode

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Reports, crawls and settings
live in the `./data` folder and persist across restarts.

### Production Build

For maximum speed and optimized performance:

```bash
pnpm build
pnpm start
```

| Command | Action |
| --- | --- |
| `pnpm dev` | Starts Next.js dev server with hot reloading |
| `pnpm build` | Builds optimized production bundle |
| `pnpm start` | Launches production server |
| `pnpm typecheck` | Validates TypeScript types |
| `pnpm test` | Runs the full Vitest suite |
| `pnpm cleaner` | Runs component architectural linter |

### Environment Variables & Settings

Copy `.env.example` to `.env.local` to customize your environment. Everything is optional:

| Variable | Description |
| --- | --- |
| `PORT` | Port to listen on (defaults to `3000`) |
| `PAGESPEED_API_KEY` | Free Google PageSpeed Insights key for Core Web Vitals and screenshots |
| `ADMIN_PASSWORD` | Password for user `admin` to protect crawls, history, and settings |
| `OPENSEO_DATA_DIR` | Path where reports, crawls, and settings are stored (default: `./data`) |
| `OPENSEO_RATE_LIMIT` | Max audits per visitor per hour (default: `60`; `0` disables) |
| `OPENSEO_MAX_CONCURRENT` | Max concurrent audits/crawls (default: `4`) |
| `OPENSEO_ALLOW_PRIVATE` | Set `true` to allow auditing localhost and private networks |
| `OPENSEO_USER_AGENT` | Custom User-Agent string sent to audited websites |
| `GEMINI_API_KEY` | Optional Google Gemini key for enhanced AI Fix suggestions |
| `OPENAI_API_KEY` | Optional OpenAI key for enhanced AI Fix suggestions |
| `SMTP_URL` | SMTP connection URL for monitor email alerts (`smtps://user:pass@host:465`) |
| `SMTP_FROM` | Sender display name and email (`OpenSEO <seo@example.com>`) |
| `OPENSEO_SCHEDULER` | Set `false` to disable the background monitor scheduler |

## Monitors and alerts

Under **Monitors**, add a page and pick how often to audit it: every day or every week, at an hour
in your time zone. OpenSEO audits it straight away, so later runs have something to compare
with, then on schedule for as long as it's running. Every run is a normal audit in History, marked _Monitor_.

Each monitor alerts when:

- **The score drops** by 5 points or more since the last run (1, 3 or 10 points, or never). The
  alert names the checks that started failing and links to the before-and-after comparison.
- **The page stops loading**, and again when it's back. OpenSEO tries once more after 30 seconds
  before calling a page down.
- **The SSL certificate** is invalid, or expires within 14 days (7, 30, or never), with
  reminders at 7, 3 and 1 days.

Alerts go wherever you set up under **Settings → Alerts**, all at once:

| Channel | Set up |
| --- | --- |
| Email | Add addresses in Settings, and point `SMTP_URL` at a mail server |
| Slack | Create an incoming webhook and paste its URL |
| Discord | In a channel's settings, open Integrations → Webhooks, create one and paste its URL |
| Webhook | Any URL. It gets each alert as JSON, for Zapier, n8n, Make or your own code |

## API

```bash
# Audit and wait for the full report
curl -X POST http://localhost:3000/api/audit \
  -H 'content-type: application/json' \
  -d '{"url": "example.com", "stream": false}'

# Or stream progress as newline-delimited JSON
curl -N -X POST http://localhost:3000/api/audit -d '{"url": "example.com"}'
```

| Endpoint | Description |
| --- | --- |
| `POST /api/audit` | Runs an audit: `{ url, stream? }` |
| `POST /api/ai/suggest` | Generates AI fix for a failing check: `{ checkId, checkTitle, summary, recommendation }` |
| `GET /api/tools/inspect?url=` | Live HTTP headers, security score, SSL, and redirect chain inspector |
| `GET /api/reports/:id` | One report as JSON (public, like the report page) |
| `GET /api/preview?url=` | Share previews, images, icons and tags for one page |
| `GET /api/reports` | History, newest first. `?domain=example.com` filters it |
| `GET /api/compare?a=&b=` | How report `b` differs from report `a`, check by check |
| `POST /api/crawl` | Crawls a site: `{ url, maxPages?, mode?: 'links' \| 'sitemap' }` |
| `GET /api/crawls/:id` | One crawl as JSON, or `?format=csv` |
| `GET` / `PUT /api/settings` | Read or change settings |
| `GET` / `POST /api/monitors` | List monitors, or add one: `{ url, schedule?, alerts? }` |
| `PATCH` / `DELETE /api/monitors/:id` | Change or remove a monitor |
| `POST /api/monitors/:id/run` | Runs a monitor now |
| `POST /api/alerts/test` | Sends a test alert to every channel |
| `POST /api/mcp` | The Model Context Protocol (MCP) server |

## Terminal CLI

```bash
pnpm scan example.com               # grades and what to fix
pnpm scan example.com --all         # every check
pnpm scan example.com --json        # the full report
pnpm crawl example.com --pages 200  # crawl up to 200 pages
pnpm check preview.example.com --baseline example.com   # what CI runs
```

## MCP Server (AI Assistants)

OpenSEO is a full [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server. Claude Code, Cursor, and other AI agents can run audits directly:

| Client | Configuration |
| --- | --- |
| Claude Code | `claude mcp add --transport http openseo http://localhost:3000/api/mcp` |
| Cursor | In `.cursor/mcp.json`: `{ "mcpServers": { "openseo": { "url": "http://localhost:3000/api/mcp" } } }` |
| VS Code | In `.vscode/mcp.json`: `{ "servers": { "openseo": { "type": "http", "url": "http://localhost:3000/api/mcp" } } }` |
| Claude Desktop | Run via Node stdio bridge: `"args": ["scripts/mcp-stdio.mjs"]` |

## Develop

```bash
pnpm dev             # start dev server with hot reload
pnpm typecheck       # verify TypeScript types
pnpm test            # run Vitest test suite
pnpm cleaner         # lint component architectural conventions
pnpm format          # format code with Prettier
```

## License

MIT