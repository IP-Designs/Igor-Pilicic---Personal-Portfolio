# Igor Pilicic - Personal Portfolio

Source for [standingpillars.com](https://standingpillars.com), the personal professional portfolio of Igor Pilicic.

Standing Pillars is a portfolio and project name, not a separately incorporated company or agency. The site presents selected work across UX and product design, regulated digital products, business analysis, AI vendor evaluation, digital delivery, and technical experimentation.

## Site structure

| Path | Purpose |
| --- | --- |
| `index.html` | English homepage |
| `hr/` | Croatian site |
| `de/` | German site |
| `services/` | Indexable topical experience pages at their original URLs, with EN/HR/DE alternates |
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

The site is static and can be deployed from the connected GitHub repository through Cloudflare Pages. Use the repository root as the deployment directory. Original service URLs remain available as personal experience and expertise pages, not agency offers.

## Privacy

The site does not load Google Analytics, use IP geolocation, or include a contact form. Theme and language preferences are stored locally in the visitor's browser. Visitors can contact Igor directly by email, telephone, or LinkedIn.

## Copyright

© 2026 Igor Pilicic. All rights reserved.
