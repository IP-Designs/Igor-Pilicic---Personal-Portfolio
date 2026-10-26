# Career alignment — local experimental review

Date: 26 October 2026

Branch: `experimental/career-alignment-2026-10-26`, based on published checkpoint `7e928f4`.

## Authority and scope

Igor explicitly approved `C:/Users/Igor/Downloads/standing-pillars-codex-fixes.md` (revision v2) as the reference for LinkedIn-related facts, following ChatGPT's inspection of his LinkedIn profile. This implementation uses that owner-approved brief; it does not claim an independent authenticated LinkedIn inspection by this session.

Changes are local and uncommitted. No Git push, production deployment, Cloudflare setting change, Search Console submission or LinkedIn edit was performed. The original supplied MD is unchanged.

## Status by brief ID

| ID | Status | Result |
|---|---|---|
| SP-01 | Already correct; supporting clarification added | Kept April 2020–June 2026 self-employment under the legal name Igor Pilicic. Specified the portfolio name's 2026 introduction in the three imprints and llms.txt. No new employer/company role. |
| SP-02 | Fixed | Intelligent Authoring is Basel, Switzerland; RCA is Penzberg and Mannheim, Germany. Both remain hybrid. Timeline, case headings, EN/HR/DE dictionaries and llms.txt agree. No intermediary was added. |
| SP-03 | Fixed | Accenture display title aligned to the brief. RCA case label now separates Lead UX Designer from workflow design/business-analysis responsibilities. Presentation, leadership, workshop and decision-support contributions remain. Roche projects remain separate. |
| SP-04 | Already correct | Kept the owner-confirmed 10,000+ usage feedback with colleague/post-engagement attribution, approximate personal outputs, and wider-team attribution for reporting reduction. No figures added, deleted or reclassified as potential users. |
| SP-05 | Already correct | Current retained UX pages already describe two distinct Roche projects, not five years at Roche. No duration rewrite needed. |
| SP-06 | Fixed | Same approved corrections in EN/HR/DE dictionaries and server-rendered HTML; checked with and without JavaScript. |
| SP-07 | Already correct / intentionally omitted | No career-break entry or non-design period added. The existing portfolio heading does not promise exhaustive, uninterrupted employment. |
| SP-08 | Fixed | Visible profile/contact copy now states full-time, part-time and contract availability in Croatia (all modes), plus suitable European/US remote opportunities. Removed implication of active worldwide engagements and blanket visa eligibility. |
| SP-09 | Fixed where needed | Retained experience pages were already personal, not agency offers. Changed remaining plural first-person wording in imprints to singular without changing liability substance. |
| SP-10 | Already correct | Prototype, development, 15% broader scope and non-commercial/non-playable showcase boundaries unchanged. |
| SP-11 | Fixed where needed | Harvey Norman start corrected to June 2015; end remains March 2017 and employment remains part-time. Narrowed sales wording to the retailer's iPhone 7 pre-orders. EN/DE imprint display names use Igor Pilicic; HR retains Igor Piličić. Existing NDA/Figma disclaimers, project depth and SEO identity preserved. |

## Principal before/after changes (English)

- RCA timeline location: `Basel, Switzerland` → `Penzberg & Mannheim, Germany`.
- RCA case heading: `Roche Diagnostics · Penzberg, Germany` → `Roche Diagnostics · Penzberg & Mannheim, Germany · Hybrid`.
- Intelligent Authoring timeline/case location: `Penzberg, Germany` → `Basel, Switzerland` (hybrid).
- Intelligent Authoring timeline role: `Lead UI/UX Designer - Regulatory Reporting Tool` → `Lead UI/UX Designer - Intelligent Authoring / Regulatory Reporting`.
- Accenture title: `UI/UX Consultant & Presentation Designer · RFP/RFI & OSINT Vendor Diligence` → `UI/UX Consultant | RFP/RFI & OSINT Vendor Due Diligence`.
- RCA case role: `UX Design Lead & Business Analyst · Supported by UI designers` → `Lead UX Designer · Workflow design and business analysis · Supported by UI designers`.
- Harvey Norman: `Jul 2015 - Mar 2017` → `Jun 2015 - Mar 2017`.
- Harvey Norman outcome: `iPhone 7 campaign contributed to highest national sales.` → `The iPhone 7 campaign contributed to the retailer's highest national iPhone 7 pre-order sales.`
- Contact location: `Based in Zagreb, Croatia - working across Europe, Asia & the US` → `Based in Zagreb, Croatia · open to full-time, part-time and contract roles`.
- Contact note: former current-client/visa wording → `On-site, hybrid or remote in Croatia, and suitable remote opportunities with European or US teams, subject to location eligibility and the employment or contracting arrangement.`

All corresponding Croatian and German text is translated, not copied in English. Existing formal English Roche title terms remain where already used professionally.

## Changed files

- `index.html`, `hr/index.html`, `de/index.html`: visible/static fallback copy.
- `lang/en.json`, `lang/hr.json`, `lang/de.json`: matching runtime translations.
- `llms.txt`: same career facts, dates, relationship, brand year and availability; existing evidence boundaries retained.
- `imprint.html`, `hr/imprint.html`, `de/imprint.html`: brand year, personal voice and language-specific display spelling.
- `EXPERIMENTAL_UIUX.md` and this report: internal review notes, excluded from the manual public export allowlist.

## Validation

- `node validate-languages.js`: 19 HTML files; zero errors and warnings.
- `git diff --check`: passed (Git also prints pre-existing safe.directory/config and line-ending notices).
- Local fresh-browser tests: EN/HR/DE × dark/light × 390px/1440px, all 12 contexts passed. Verified updated runtime text, expandable experience/role content, no horizontal/text overflow and no JavaScript errors in the tested flows.
- JavaScript-disabled checks: corrected Roche locations and Harvey Norman dates present in all three static HTML variants.
- Compared homepage head content and all href/src/id attributes with HEAD: unchanged. Page titles, canonical/hreflang/structured data, links, assets and anchors preserved.
- `robots.txt`, `sitemap.xml`, `_headers` and `_redirects`: unchanged from HEAD after normalizing checkout line endings. All 14 sitemap URLs retained.
- Reviewed representative Croatian mobile dark and German desktop light screenshots.
- QA script and screenshots are outside the public site root, in the thread's visualization directory (`career-alignment-qa.cjs` and `career-alignment-*.png`).

## Manual LinkedIn checklist — not executed

Based on the brief, only if not already updated there:

1. Clarify each Roche role's project geography: IA/Basel, RCA/Penzberg and Mannheim; both hybrid.
2. Name Intelligent Authoring / Regulatory Reporting in the corresponding role description while retaining Lead UI/UX Designer.
3. Keep business analysis and executive presentation design as responsibilities alongside the agreed role titles.
4. Ensure the featured portfolio link describes a personal portfolio introduced in 2026, not a company operating since 2020.
5. Align current availability with Croatia full-/part-time/contract and suitable European/US remote opportunities.
6. Skills/services ordering and the LinkedIn career-transition presentation remain optional owner decisions. No website timeline entry is required.

## Boundaries and remaining separate items

- No further date/location/title confirmation is needed for the facts explicitly approved through the MD in this turn. Other facts absent from the brief were not invented or changed.
- Evidence provenance for existing metrics is not expanded by the LinkedIn comparison. Existing qualified, previously approved wording is preserved; no independent product-analytics verification is claimed.
- Privacy/Cloudflare analytics discrepancy remains a separate task. No privacy policy or Cloudflare setting was changed in this career update.
- Minor unrelated footer/name inconsistencies and previous accessibility/animation audit items remain outside this change.
- Before a future publication, prepare a new reviewed manual-upload package and set homepage sitemap modification dates to reflect the approved content revision. No release package was created now.

Local review: `http://localhost:3000/hr/?review=career-alignment-1#experience`.
