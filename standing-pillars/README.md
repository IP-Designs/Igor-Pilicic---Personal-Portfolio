# Standing Pillars

Professional portfolio and consultancy site for Igor Pilicic - enterprise UX/UI design, AI procurement audit, OSINT vendor evaluation, and design engineering for pharma and regulated industries.

**Live:** [standingpillars.com](https://standingpillars.com)

## Tech Stack

- Static HTML / CSS / JavaScript (no framework)
- Cloudflare Pages hosting
- Client-side i18n (EN / DE / HR)
- Node.js dev server for local testing

## Project Structure

| Path | Description |
|------|-------------|
| `index.html` | English landing page |
| `de/` | German localized page |
| `hr/` | Croatian localized page |
| `lang/` | i18n JSON translation files |
| `simulation/` | Interactive game engine demo (Tiny Humans Engine) |
| `portfolio/` | Legacy case study (iPhone 7 landing page) |
| `images/` | Static assets, case study visuals, portraits |
| `_headers` | Cloudflare security headers (CSP, X-Frame-Options) |
| `_redirects` | Cloudflare redirect rules |

## Local Development

```bash
node server.js
```

Serves the site at `http://localhost:3000`.

## Build

No build step required. The site is static.

After editing `styles.css`, run cache-bust to update version hashes in HTML:

```bash
node cache-bust.js
```

## Deploy

```bash
wrangler pages deploy . --project-name=standing-pillars --branch=main --commit-dirty=true
```

## Branches

- **main** - Production (deployed to Cloudflare Pages)
- **sandbox** - Development

## License

All rights reserved. (c) 2026 Standing Pillars - Igor Pilicic.
