# `data-lang-href` Pattern - Language-Aware Service Links

## Problem

The main site uses i18n.js to switch languages in-place (no redirect). Service subpages live at language-prefixed paths:

- EN: `/services/ux-design/`
- DE: `/de/services/ux-design/`
- HR: `/hr/services/ux-design/`

Standard `href` attributes are static - they don't update when the user switches language. This causes links to always point to the wrong language version.

## Solution

Add `data-lang-href` to any `<a>` element that links to a service subpage. The value is the **base path** (without language prefix):

```html
<a href="services/ux-design/" data-lang-href="services/ux-design/" data-i18n="nav.uxDesign">UX Design</a>
```

The `updateServiceLinks()` function in `i18n.js` rewrites the `href` on page load and on every language switch. The `data-i18n` attribute ensures the link **text** also translates.

| Active Language | Resulting href |
|---|---|
| EN (default) | `/services/ux-design/` |
| DE | `/de/services/ux-design/` |
| HR | `/hr/services/ux-design/` |

## How It Works

```js
function updateServiceLinks() {
  document.querySelectorAll('[data-lang-href]').forEach(el => {
    const basePath = el.getAttribute('data-lang-href');
    if (currentLang === CONFIG.defaultLang) {
      el.setAttribute('href', '/' + basePath);
    } else {
      el.setAttribute('href', '/' + currentLang + '/' + basePath);
    }
  });
}
```

Called in two places inside `i18n.js`:
1. `init()` - sets correct hrefs on page load
2. `setLang()` - updates hrefs when user switches language

## Rules for Adding New Service Pages

1. Every `<a>` linking to a service subpage **must** have `data-lang-href`
2. Every `<a>` in the nav dropdown **must** also have `data-i18n` so text translates at runtime
3. Add the corresponding i18n key to all 3 lang JSON files (`nav.yourKey`)
4. The `data-lang-href` value is always the EN base path (e.g., `services/design-systems/`)
5. Apply this on **all pages** that contain the link (EN, DE, HR main pages, nav dropdowns, etc.)
6. Create the subpage in all 3 language directories:
   - `/services/<slug>/index.html`
   - `/de/services/<slug>/index.html`
   - `/hr/services/<slug>/index.html`
7. Each subpage needs hreflang tags pointing to all 3 versions + x-default
8. Croatian pages must use proper diacritics (č, ć, š, ž, đ)

## Checklist for New Service Links

- [ ] `data-lang-href` attribute present on the `<a>` element
- [ ] `data-i18n` attribute present on dropdown links (e.g., `data-i18n="nav.uxDesign"`)
- [ ] i18n key added to `lang/en.json`, `lang/de.json`, `lang/hr.json`
- [ ] Value matches the EN base path exactly (no leading slash, trailing slash included)
- [ ] Link exists on EN, DE, and HR main pages
- [ ] Nav dropdown updated on ALL pages (main + all service pages)
- [ ] All 3 language versions of the subpage exist
- [ ] Hreflang cross-references are complete on all 3 subpages
- [ ] Croatian pages use proper diacritics (č, ć, š, ž, đ)
- [ ] Run `node validate-languages.js` - 0 errors, 0 warnings
- [ ] Tested: switching language updates the link href and text correctly
- [ ] Tested: clicking the link navigates to the correct language version

## Validators

- `node validate-languages.js` - Scans all HTML for language issues:
  - `<html lang>` vs file path
  - `og:locale` consistency
  - Hreflang completeness
  - Nav dropdown text vs page language
  - Missing `data-i18n` on dropdown links
  - Croatian diacritics
  - Canonical URL language prefix
  - i18n keys in HTML vs JSON files
- `node fix-croatian-diacritics.js` - Batch-fixes missing diacritics in `hr/` files
