# Igor Pilicic — Personal Portfolio

Source for [standingpillars.com](https://standingpillars.com), the personal professional portfolio of Igor Pilicic.

Standing Pillars is a portfolio and project name, not a separately incorporated company or agency. The site presents selected work across UX and product design, regulated digital products, business analysis, AI vendor evaluation, digital delivery, and technical experimentation.

## Site structure

| Path | Purpose |
| --- | --- |
| `index.html` | English homepage |
| `hr/` | Croatian site |
| `de/` | German site |
| `services/` | Detailed expertise pages; retained URLs preserve existing links |
| `lang/` | Client-side translations |
| `portfolio/` | Selected legacy portfolio work |
| `simulation/` | Interactive Tiny Humans technical demonstration |
| `images/`, `videos/`, `fonts/` | Media assets |
| `_headers`, `_redirects` | Cloudflare Pages configuration |

## Local development

```powershell
node server.js
```

Open `http://localhost:3000`.

## Validation

```powershell
node validate-languages.js
```

After changing CSS or JavaScript, update cache-busting references:

```powershell
node cache-bust.js
```

## Deployment

The site is static and can be deployed by uploading the repository contents to Cloudflare Pages. Upload the repository root—not a parent folder and not a nested copy.

## Privacy

The site does not load Google Analytics or use IP geolocation for language selection. Theme and language preferences are stored locally in the visitor's browser. Contact messages are transmitted through Formspree, as described in the privacy policy.

## Copyright

© 2026 Igor Pilicic. All rights reserved.
