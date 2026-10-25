# Experimental manual-upload release — 25 October 2026

- Branch: `experimental/manual-release-2026-10-25`.
- Approved UI baseline: `5e05969` (mobile CTA centring, SVG-only nav hover and gold-filled outlined CTA hover/pressed states).
- Final requested correction: keep the professional-portfolio identity beneath the wordmark visible at intermediate desktop widths instead of hiding it; retain separation from navigation. English/German visible names use `Igor Pilicic`, Croatian uses `Igor Piličić`. Corrected the remaining German privacy-page visible spelling. Existing structured-data alternate names and identity URLs are unchanged.
- Shared CTA stylesheet version: `sp-cta-5` across its existing 19 HTML consumers.
- Website content and design otherwise remain at the approved checkpoint. This release request covers the final tagline correction, Git checkpoint/push and manual-upload packaging; the separate final-audit suggestions are not implemented here.

## Deferred audit findings

Lightbox modal focus/return and larger close target; visible desktop motion poster while playback is paused; pause off-screen rendering and extend reduced-motion support to gallery/simulation; legacy iPhone demo `fadeContent` console error. Mobile contact tap areas and further content compaction remain optional polish. These are not represented as fixed by this release.

## Packaging and publication

Export only the committed public paths in `docs/manual-upload-files.txt`. Verify root-level `index.html`, `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, all language routes and media; exclude Git data, `.wrangler`, docs, packages and local development scripts. Check the exported files against their source and Cloudflare Direct Upload limits.

Preparing the ZIP and pushing this branch do not publish the site. The user will upload the ZIP or extracted site folder to the existing Cloudflare Pages project; no Cloudflare account, DNS or deployment changes are authorized in this task.
