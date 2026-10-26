# Experimental UI/UX version

Local branch: `experimental/ui-ux-redesign`
Previous review checkpoint: `3a778de` on `agent/reposition-portfolio`.
Review date: 2026-10-22.

## Four changes

1. The hero offers three keyboard-accessible paths: products and complex workflows, visual design and brand, and technical experiments. Selecting a path highlights the existing network and reveals a direct link to work. Mapped network nodes can also select a path. The mobile version uses the same text controls.
2. The profile combines biography, availability, selected organizations, and three working principles. Repeated standalone sales sections have been condensed. Detailed expertise and tools remain available under the working-method disclosures.
3. Case studies now follow the profile, before employment history. An equal-sized image index uses actual existing work to help visitors find relevant evidence quickly. Existing graphic, interior, motion and game artifacts are retained.
4. The RCA case includes a native disclosure with four selectable annotations on a development-stage Figma design. Notes explain orientation, contextual guidance, structured methods and progressive disclosure. They do not claim new research findings or measured outcomes.

## Reading order

Hero > Profile > Work > Experience > Working method and toolbox > Engine > Simulation > Contact.

## Verification

- HR, EN and DE static pages and translation dictionaries.
- Browser checks at 1440px and 390px, plus overflow checks at 320px, 768px and 1024px.
- Hero mouse, canvas-node and keyboard selection; case expansion; annotations; gallery lightbox; retained tools; theme switching.
- All local anchor targets and translation keys resolve; no duplicate IDs or missing local assets were found.
- Reduced-motion behavior and light/dark layouts were exercised.

## First review pass

- The hero's complexity word briefly fragments and reassembles on entry, hover or tap. Reduced-motion preferences disable the effect; a single readable word remains available to assistive technology.
- Utility labels use the main Inter font. Hero, profile and work index numbers are larger and bold; only hero entry points have icons.
- The portrait is circular and enlarged. Work index images have matching dimensions and aligned captions. The four evidence stages are larger and centered.
- The current experience entry describes independent product development without unemployment or job-search framing.
- The engine demonstration is an autonomous showcase, not a playable game. Mother represents the business and the child represents the designer.
- The working-method content and layout are unchanged. Its typography now follows the shared index style, as requested in the second review. An interactive sequence and a separate playable portfolio game remain future discussion items, not implemented features.
- Checked all three languages, reduced motion, animation replay, equal image and caption alignment, portrait dimensions and overflow at 320, 390, 768, 1024 and 1440 pixels.

## Typography audit, second review

- Shared `--font-index` makes hero, profile, work index, proof legend and working-method numbers identical in font family, size, weight and line height.
- Removed remaining monospace labels in the gallery and interior-work captions through the experimental font token. The lightbox close button also uses the body font.
- Retained Gatha intentionally for the hero title and Standing Pillars wordmark. Remaining page text uses Inter; embedded artwork and the simulation retain their own visual identity.
- Browser audit checked over 500 text-bearing elements in each of HR, EN and DE, including expanded disclosures and cases. Confirmed no unexpected font families, matching index typography, light/dark themes and no page overflow at 320, 390, 768, 1024 and 1440 pixels.

## Square-corner review

- All content boxes, case outcome callouts, cards, gallery frames, badges and rectangular buttons now use square corners through shared radius tokens and scoped overrides.
- Portrait, diagram pins, timeline markers and the gallery switch retain their intentionally circular or switch-shaped geometry.
- Confirmed all box corners are zero-radius in HR, EN and DE, including expanded case studies; mobile layouts remain within the viewport.

## Spring process and Roche feedback (earlier checkpoint)

- Replaced the four-step index with six short, always-visible stages: understand the problem, agree on a direction, design and test, support delivery, learn from use, enable growth.
- A continuous SVG spring connects the stages, drawing once on entry. Later stages use the existing copper accent. It is decorative: no clicks, delays, autoplay presentation or hidden step content are required. Reduced motion disables drawing; the complete graphic remains visible without JavaScript.
- Desktop uses a horizontal coil; smaller screens use a vertical coil beside the same ordered text. Existing method, expertise and tools disclosures remain available.
- Roche outcome clarification supplied by Igor on 2026-10-22: colleagues told him, a few months after his engagement ended, that the RCA platform was being used by more than 10,000 users. This is reported adoption, not an intended audience or a claim about today's active-user total.
- Updated the case summary, outcome, experience, profile metric, graph tooltip and llms.txt consistently. No ownership of subsequent AI implementation or independently verified deployment-wide figures was added.
- Graphic design library > 3D animation > interior design remains the approved work-gallery order.
- HR/EN/DE checks covered translations, attributed user figures, six readable steps, desktop/mobile layout, reduced motion and completion of the entry animation. Existing hero, case study, gallery, theme and keyboard checks also passed.

## Icon-led process review, 2026-10-24

- Replaced the spring metaphor with six standalone line icons: conversation/search, direction, interface/check, handover, feedback loop and expansion. Each icon sits above its number; the approved headings, descriptions and feedback note are unchanged in HR, EN and DE.
- Thin connectors trace once on entry. Text and icons are immediately visible, with no required clicks or waiting. Reduced-motion preferences disable tracing.
- Desktop shows six columns, medium screens use two rows of three, and mobile pairs the icon/number rail with the heading and description. No extra cards or icon frames were added. Removed obsolete spring SVGs, styles and observer logic.
- Retained subsequent approved changes: smaller transparent method labels; all three expertise badges share the core-expertise style and updated web/brand description; graphic gallery is enabled by default and can still be switched off.
- Browser checks covered seven widths from 320 to 1440 pixels, both themes, all three languages, unchanged step text, decorative SVG accessibility, no unexpected box styles, animation completion and static HTML content. Default gallery and expertise badge consistency also passed.

## Mobile gallery and simulation review, 2026-10-24

- Created local checkpoint `ddb9f21` before this pass, from clean checkpoint `7a90537`. No push or deployment.
- On mobile, graphic and motion galleries use uncropped 16:9 media frames with the title and short description below the artwork. Optional longer context opens with a labelled, touch-friendly control. The graphic gallery remains enabled by default; existing on/off and animation playback controls are retained.
- The simulation has a separate heading, square scene and caption in portrait orientation; a landscape phone uses a 16:9 scene. The camera fits both characters instead of applying the desktop minimum zoom, and dialogue wraps within the scene boundaries. This remains an autonomous showcase, not a playable game.
- Desktop overlay presentation is retained. HR, EN and DE share the same layout and translated description labels. Both color themes follow the existing palette.
- Browser checks cover five portrait widths from 320 to 768 pixels, 844px phone landscape, 1024px and 1440px desktop, media proportions, camera framing, dialogue bounds, gallery switching, description expansion and animation playback. Screenshots were inspected for graphic work, motion and the simulation.
- Added a guard for transient zero-sized simulation canvases during responsive reflow. Full hero, case-study, gallery, theme and process-icon regression checks pass in all three languages without JavaScript errors or missing local assets.
- Other audit findings remain outside this pass; no new effects were added.

## Mobile navigation review, 2026-10-24

- Saved the approved gallery and simulation work as local checkpoint `7dc3a29` before this pass. Navigation changes remain separate for local review.
- Retained the existing dropdown appearance and native navigation links, without a modal or focus trap. The experimental header now uses its mobile layout through 900px, including landscape phones.
- The open/close control has a 44px touch target, a visible close icon, `aria-controls`, `aria-expanded` and translated open/close labels. Hidden mobile links are inert and excluded from the accessibility tree.
- Escape closes the disclosure and returns focus to its button. Outside clicks and tabbing out also close it. Selecting a section closes the menu and moves focus to that section's heading; temporary heading tabindex is cleaned up after focus leaves.
- The dropdown scrolls within the available viewport, including short landscape screens and safe-area padding. Language and theme controls have 44px targets and remain reachable without closing the menu. Resizing to desktop clears the mobile state and restores visible, focusable desktop links.
- Browser checks cover HR, EN and DE, live language changes, both themes, keyboard interaction, six mobile/tablet dimensions from 320px to 900px, destination focus, controls on short screens and desktop resize behavior. Existing hero, case-study and mobile media checks are rerun separately.

## Working-method duplication cleanup, 2026-10-24

- Removed the entire legacy method disclosure ("A short look at my method" / "Kratko o mojoj metodi" / "Meine Methode in Kürze") from the EN, HR and DE page markup, rather than hiding it with CSS.
- Retained the six icon-led stages and feedback note, the complete expertise disclosure and the tools disclosure without changes. Prior mobile navigation changes are preserved.
- Verified that each HTML file differs from its pre-edit state only by removal of the legacy block. Browser checks passed in HR, EN and DE at 320, 390, 768 and 1440px: six stages, two working disclosures, no horizontal overflow, missing translations or JavaScript errors.
- No commit, push or deployment in this pass; all work remains in the local experimental branch.

## Compact engine summary, 2026-10-24

- Replaced the long default engine presentation with the project name, a visible working-prototype / in-development status, a short explanation of the project and a short first-person description of Igor's contribution. HR, EN and DE static text and dictionaries are aligned.
- Moved the original project scope, statistics, SDK/editor progress, four technical cards, AI-assisted development method and supporting caveats into one native, closed-by-default "Technical details" disclosure. The technical facts and wording are retained. Removed the decorative play icon and duplicated project subtitle from the technical header.
- Kept the autonomous simulation outside the disclosure and unchanged, including its mobile framing and dialogue. The summary explains that it is not a playable game; the existing direct link remains visible.
- On the HR page at 390px, the closed engine section decreased from 4,175px to 666px and its rendered text from 389 to 72 words. This is a reading-length reduction, not a claim about download size.
- Checks cover four widths from 320 to 1440px, all three languages, both themes, native mouse/keyboard toggling, live language switching with details open, retained technical content and visible prototype status. No horizontal overflow, unresolved translations, duplicate IDs or JavaScript errors were found.
- Verified that the simulation and all other sections remain byte-for-byte unchanged, apart from the stylesheet cache version. No commit, push or deployment in this pass.

## Compact experience review, 2026-10-24

- Saved the approved compact engine work as local checkpoint `a90bfd7` before this pass. Experience refinements remain uncommitted for local review.
- Retained all nine timeline entries, with existing role titles, dates, organizations, legal self-employment wording and client-contract context. The two Roche projects remain separate entries.
- Each past role now has one short visible contribution summary and a native, closed-by-default disclosure for full role details. The current personal-project entry has a shorter summary without employment-seeking language. Original responsibility bullets remain available without rewriting or duplication.
- Kept the RCA adoption statement visibly attributed to later colleague feedback, the reporting-effort result attributed to the wider product team, and the Harvey Norman award visible outside every disclosure.
- Added translated summaries and role-detail labels in HR, EN and DE. Accenture's existing client-context note now also translates when language is switched. Disclosure labels include their role heading for accessible identification.
- Reduced card padding and spacing within the experience section; no fonts were reduced and no additional effects were added. At 390px, HR default section height changed from 6,035px to 3,634px and visible text from 699 to 399 words.
- Checks cover four widths from 320 to 1440px, both themes, every role disclosure, keyboard toggling, live language changes, visible award and qualified outcomes, separate Roche entries, translation keys and duplicate IDs. No horizontal overflow or JavaScript errors were found.
- Source comparison confirms that all prior responsibility bullets are retained and all other page sections, including the engine and simulation, are unchanged apart from the stylesheet cache version. No push or deployment.

## Concise profile and proof-legend cleanup, 2026-10-24

- Saved the approved compact experience work as local checkpoint `dcff697` before this pass.
- Retained the personal opening line and shortened the professional profile to two concise paragraphs about listening, reading between the lines and bringing UX, workflows and teams together. Removed the additional experience-range paragraph and the three repeated principle cards; the six-stage process remains unchanged.
- Kept the portrait, profile heading, five qualified metrics, availability and selected organizations. The complete personal paragraph, including family, psychology, anthropology, sociology, astronomy, films, series and games, is unchanged in all three languages.
- Removed the standalone Problem > Constraint > Decision > Outcome legend from all three pages as requested. The work index, Figma disclosure, case-study content and six process stages are retained. Removed only the obsolete legend/principle CSS rules.
- HR, EN and DE checks cover 320, 390, 768 and 1440px, both themes, live language switching, portrait geometry, retained personal copy, metrics, anchor targets and unchanged gallery/timeline structure. General hero and case-study regression checks pass with no missing assets, translation keys or JavaScript errors.
- Interior and whole-experience cover-card/disclosure ideas were discussed only, not implemented. Existing role-detail disclosures remain. No commit of these new changes, push or deployment.

## Visitor-controlled section covers and iPhone video, 2026-10-24

- Added closed-by-default native disclosures for the interior portfolio and full experience timeline. The interior cover uses the existing Venecija render as its background, with a readable overlay and a clear three-comparison action. All six original image elements and their descriptions remain available when opened.
- Experience now opens with "17+ years. From visual design to complex systems", organization names, a description distinguishing the two Roche projects from the Accenture context and a visible Harvey Norman award. The nine-entry timeline and individual role details are preserved inside the disclosure.
- Added a close control at the bottom of each long reveal, restoring focus and scrolling to its cover. Links to interior timeline targets open their containing disclosures; links to the experience section itself show the cover without forcing the chronology open.
- HR, EN and DE share the same behavior and translated open/close labels. Cover controls were checked at 320, 390, 850 and 1440px, with keyboard, native toggling, live translations, both themes, deep links and mobile navigation. No horizontal overflow or JavaScript errors were found; all prior responsibility bullets and interior image elements were compared against the pre-edit source.
- Fixed the archived iPhone video markup's invalid typographic quotes and sizing attributes. Removed the mobile 100vh/object-fit:cover rule; the film now scales to container width in its native 1536:640 ratio with inline playback. The original Apple source is unchanged and loaded successfully during QA. Five widths from 320 to 1440px passed framing checks.
- Prior concise-profile changes are preserved and remain uncommitted together with this pass. No push or deployment.

Preview: `http://localhost:3000/hr/?review=section-covers-1#interior-design`.
Cloudflare deployment remains a separate, user-approved step.

## Optional black-and-gold palette study, 2026-10-24

- The approved section-cover/profile/video work was saved as local checkpoint `0c758d0` before this study. No new commit, push or deployment in this pass.
- Added an opt-in `?palette=black-gold` preview for HR, EN and DE. Without the query, the existing palette and saved theme preference are unchanged. The preview opens in dark mode without changing stored preferences; the theme toggle still works.
- Black base surfaces, warm white body/headings, muted gold section titles, key numbers, interaction accents and selected emphasis. Secondary text and thin dividers are neutral. No metallic gradients, added animation or layout/content changes.
- Scoped the interactive hero map's accent colours to the preview; original image/video artwork, portraits, Figma examples and simulation colours remain unchanged. The interior cover retains its render with a neutral black overlay.
- Browser checks passed for all three languages at 320, 390, 850 and 1440px: no horizontal overflow, missing local assets or JavaScript errors; section disclosures, theme changes and the default palette still work. Desktop and mobile screenshots were inspected. The existing general hero, case-study and mobile-navigation regression suite also passes.

Palette preview: `http://localhost:3000/hr/?review=black-gold-1&palette=black-gold`.
Original palette: `http://localhost:3000/hr/?review=section-covers-1`.

## Approved default black-and-gold palette, 2026-10-24

- Promoted the approved study to the default dark palette in EN, HR and DE by adding the same palette attribute to each page. No query parameter is needed; old preview links continue to work.
- Retained the existing light-theme switch and explicitly saved theme preferences. Added cache versions for the palette and hero-map script. Content, layout, artworks and simulation remain unchanged from the approved preview.
- Browser checks passed for all three language routes without query parameters at 320, 390, 850 and 1440px. Verified section disclosures, language changes, saved light/dark preferences after reload and gold titles/black section backgrounds. General desktop/mobile interaction regression checks also passed, with no JavaScript errors or missing local assets.
- Checkpoint and GitHub push are authorized on `experimental/ui-ux-redesign`; `main` and Cloudflare publication remain out of scope. The local server continues to serve this checkout.

Current local preview: `http://localhost:3000/hr/?review=black-gold-default-1`.

## Matching gold loader, 2026-10-24

- Matched the loader symbol, wordmark and solid progress fill to the shared muted gold token; added a faint gold track on black. The loader remains consistent when a visitor has selected the light page theme.
- Applied through shared palette styles with cache versions on EN, HR and DE. Loading logic, timing and page content are unchanged.
- Verified real loading and normal dismissal in all three languages and both themes, with desktop/mobile screenshots. Local changes only; no new commit, push or Cloudflare publication.

## Consistent vertical section rhythm, 2026-10-24

- Audited the default closed page at 390, 768, 1074 and 1440px before editing. Most adjacent text sections accumulated two 88px paddings on desktop and two 58px paddings on mobile; the simulation overlay also used width-based percentage padding.
- Added shared responsive spacing tokens: section padding 56px desktop / 44px tablet / 36px mobile, heading-to-content spacing 32 / 28 / 24px and supporting subsection spacing 40 / 32 / 28px. Main text-to-text transitions are now approximately 112 / 88 / 72px, including the hero/profile, experience/process and process/engine transitions.
- Removed the separate case-section bottom-padding exception, reduced excess interior padding, standardized follow-up margins and tightened footer and reveal spacing. Kept the compact joins and existing heights/framing of the artwork galleries.
- Replaced the simulation overlay's percentage padding with the shared spacing. Added a subtle black text scrim to keep the overlaid title/caption readable against the moving scene. Mobile still uses its separate text/media layout; the iframe, camera and media aspect ratios are unchanged.
- No text, typography, content order or interaction changes. The prior gold loader remains intact. HR's default reading height decreased by about 480px at 1440px and 520px at 390px; this is not a download-size reduction.
- Checked HR, EN and DE at eight widths from 320 to 1920px, open/closed disclosures and both themes. General hero/case/navigation and mobile gallery/simulation regression checks pass, including landscape, camera fit and dialogue bounds. No missing local assets, JavaScript errors or horizontal overflow were found. Changes remain local and uncommitted; no push or deployment.

Current preview: `http://localhost:3000/hr/?review=section-rhythm-1#ai-engineering`.

## Deferred gallery and simulation loading, 2026-10-25

- Created local pre-change checkpoint `e3f8765` before implementation. The worktree was already clean, so the checkpoint retains the same content as `0399b1c`. No push or Cloudflare changes.
- Removed the three duplicated parent-page simulation preload lists. The existing gold loader now follows page DOM/font readiness with a bounded timeout; it no longer requests the off-screen simulation's images or map.
- Added shared `media-loading.js` for the three language pages. The graphic gallery remains checked/on by default, gets its video source within 600px of the viewport and plays when visible. It pauses off-screen or in a hidden tab without changing the toggle; a visitor's explicit off selection remains off. An existing artwork preview serves as the poster until playback.
- The simulation iframe initially has only a deferred source. It navigates within 600px of the viewport, with an existing preview image while the document loads. The frame dimensions, scene, camera and dialogue code are unchanged. Language changes before activation update only the pending URL; changes after activation reload once in the selected language.
- Local cold-page checks recorded 20–22 initial requests, compared with 432 in the prior audit, and zero initial requests for the gallery movie, simulation document/assets or p5. This is a local request-count comparison, not a production speed or Core Web Vitals result.
- Checks passed in HR, EN and DE on desktop and mobile: near-only activation, default-on gallery, manual toggle persistence, off-screen pausing, language changes before/after activation, direct section links and stable page height. General UI regression and mobile media tests also pass, including five portrait widths, landscape, camera fit and dialogue bounds. No JavaScript errors or missing local assets found.
- Implementation remains uncommitted after the pre-change checkpoint; all work is local. Other audit items remain for later passes.

Current preview: `http://localhost:3000/hr/?review=deferred-media-1`.

## Engine section light-theme consistency, 2026-10-25

- Replaced the legacy inverted green engine appearance in light mode with inherited page colours: the same warm light background as other text sections, readable dark type and neutral card surfaces/dividers. Updated the summary, expanded technical details, tags and progress labels together.
- Scoped all overrides to light mode; compared dark-mode descendant styles with/without these overrides and found no changes. No typography, layout, content or loading behavior changes.
- HR, EN and DE checks passed at 320, 390, 768, 1041 and 1440px, with the technical disclosure open and closed. Light text contrast checks passed for rendered engine text; the dark background and gold title remain unchanged. Deferred-media regression checks also pass. Local only, no commit, push or publication.

Current preview: `http://localhost:3000/hr/?review=engine-theme-1#ai-engineering`.

## Matching gold identity in light mode, 2026-10-25

- Replaced the light theme's green/teal accent tokens with dark gold (`#806020`, lighter accent `#846322`) and greenish secondary text with warm neutral greys. Retained the ivory page surfaces and dark main headings. Accent text remains readable against both page and supporting-card backgrounds.
- Mapped hero graph nodes, connections and particles to the same dark-gold family in light mode; labels and light tooltip text are black, never gold. Dark mode keeps its existing gold node colours and white labels. No changes to project artwork, photographs, gallery movies or simulation content.
- Updated remaining hard-coded light-mode UI accents on annotation pins, the gallery switch and interior result labels; neutralized green-tinted cover overlays and maintained readable footer text. All three language pages share the same styles and cache versions.
- Fixed graph sizing after crossing mobile/desktop breakpoints: measure the container and observe its width, rather than retaining a zero-width canvas after the mobile graph is hidden.
- Checks passed in HR, EN and DE at five widths from 320 to 1440px, with disclosures open, live light/dark switching and saved light preference. Canvas drawing was inspected programmatically: black labels/dark-gold nodes in light mode; white labels/original gold nodes in dark mode. No remaining green/blue UI text, overflow or JavaScript errors were found in the tested states. Work remains local and uncommitted; no push or deployment.

Current preview: `http://localhost:3000/hr/?review=light-gold-1`.

## Matching privacy/imprint pages and error-page inventory, 2026-10-25

- Updated the six EN/HR/DE privacy and imprint pages to reuse the portfolio's current type, ivory/dark-gold light palette and black/gold dark palette. Added a shared reading stylesheet and a small, separate theme controller; no hero, gallery or simulation scripts are loaded on these pages.
- Added native language links to equivalent documents, a localized theme button and a language-appropriate return link. Saved theme preferences carry between the main page and these pages. Improved text sizing, wrapping, link contrast, keyboard focus and touch targets.
- Existing legal text, dates, contact information, external policy links and cross-document links are retained. DOM text comparisons against the checkpoint passed for all six documents. This pass is a presentation update, not a legal review.
- Browser checks passed for both themes, every document and all three languages at 320, 390, 768, 977 and 1440px. Verified persisted theme changes, language/cross-document navigation, readable title colours, 44px utility controls, no overflow, no missing local resources and no JavaScript errors.
- Read-only error-page inventory: root `404.html` exists with EN/HR/DE translation keys, but uses the former blue presentation. The local server currently returns a bare `<h1>404</h1>` for missing paths instead of that document. No dedicated 403/500/502/503, offline or maintenance HTML pages were found. Error handling, `404.html`, server configuration and Cloudflare were not changed.
- Changes remain local and uncommitted; no push or publication.

Previews: `http://localhost:3000/hr/privacy.html?review=auxiliary-1` and `http://localhost:3000/hr/imprint.html?review=auxiliary-1`.

## Matching 404 page and local error response, 2026-10-25

- Rebuilt `404.html` using the shared auxiliary reading shell, current portfolio typography, black/gold dark theme and ivory/dark-gold light theme. Removed the legacy blue/serif presentation and consultancy tagline. Kept the short pillars-themed description.
- Added language-aware home/work recovery links, privacy/imprint links, native EN/DE/HR navigation, a saved-theme toggle and keyboard skip/focus treatment. Shared translation loading runs once per navigation. All first-party asset paths start at the site root so nested missing URLs remain styled and functional.
- The local server now serves this document with a real HTTP 404 status and no-index response headers without redirecting or changing the requested address. HEAD responses have no body; valid pages remain 200. Directory redirects retain query parameters, and malformed URL encoding returns a controlled 400 response rather than crashing the server. No additional custom error pages were created.
- Browser checks passed for all three languages and both themes at 320, 390, 768, 977 and 1440px plus short landscape. Verified localized recovery links, query/path/browser language selection, language changes on nested missing paths, theme persistence, keyboard skip navigation, 44px utility/48px action targets, button contrast and no horizontal overflow. No JavaScript errors or missing supporting assets were found.
- HTTP checks passed for missing pages/files and nested routes, 404/200 HEAD responses, query-preserving directory redirects and malformed URLs. Rechecked all six legal documents in both themes at five widths: original legal text remains unchanged, and their navigation and theme controls still pass. Desktop/mobile 404 screenshots were inspected.
- Local and uncommitted only. No Git push, Cloudflare configuration or publication. Production hosting behavior has not been verified in this pass.

Preview a real missing route: `http://localhost:3000/hr/stranica-ne-postoji?review=404-1`.

## Full case-study content on mobile, 2026-10-25

- Reproduced the clipped RCA panel at 414px: a legacy, more-specific expanded-state selector imposed a 3000px maximum height despite the experimental override. Remaining images and the outcome section were cut off.
- Scoped the no-maximum-height rule to the expanded state as well. Both experimental Roche panels now grow naturally with text wrapping, loaded media and nested disclosures, while the existing hidden-state and expand/collapse behavior remain unchanged. No content or visual redesign; refreshed the shared stylesheet cache version across its consumers.
- Browser checks passed in EN/HR/DE, both themes, at 320, 390, 414, 480, 768 and 1440px. Verified full panel/content height, nested decision disclosure, image lightbox, collapse/reopen, no horizontal overflow, no missing assets and no JavaScript errors. Direct nested deep links and landscape resize also passed; inspected the mobile screenshot showing the last RCA image and complete outcome before the next case.
- Local and uncommitted only, retaining the pending auxiliary-page/404 work. No push or Cloudflare changes.

Preview: `http://localhost:3000/hr/?review=case-height-1#cs-rca`.

## Conservative SEO / LLM audit and sitemap refresh, 2026-10-25

- Compared public live responses with the experimental source. Kept homepage titles, canonical URLs, hreflang, visible HTML, robots.txt and hosting rules unchanged. Corrected only the HR/DE ProfilePage JSON-LD page URL/ID; shared Person identity is unchanged.
- Updated the sitemap's five existing canonical entries with source-appropriate dates: homepage translations 25 October; iPhone work and simulation project 24 October. Retained language alternates and excluded noindex legal/error documents and section fragments. No extra URLs were retired in this pass.
- Updated llms.txt to match current independent work, the published development Figma examples with fictional content, and existing portfolio deep links. Kept qualified outcomes and prototype boundaries. This is factual context, not a promise of AI visibility or a replacement for normal SEO.
- Regression checks cover unchanged core metadata/HTML, valid JSON-LD/XML, local indexability and links, social image dimensions, unchanged robots/hosting policy and live sample crawler user-agent responses.
- Pre-release audit flags: live sitemap still lists 14 URLs while the experimental version has 5 because of nine previously prepared service-page retirements; check their search value before deploying those redirects/noindex rules. Independent DNS queries report NXDOMAIN for www, while the bare domain works. Existing client-side language switching can mismatch visible language and metadata; the social image still uses the old consultancy tagline. These were reported, not silently changed.
- Detailed report and response evidence are stored outside the public site root in the task's visualization folder. All work remains local and uncommitted; no push, Search Console submission, Cloudflare or DNS changes.

## Retained experience pages instead of service-page retirement, 2026-10-25

- Following the redirect audit and explicit approval, kept all nine original EN/HR/DE `/services/` URLs as independent, indexable experience and expertise pages. Removed only their nine retirement redirects and the three service-path noindex/nofollow header blocks. The separate existing www rules and DNS issue remain outside this change; legal/error noindex and client-image indexing protections are untouched.
- Reframed the nine pages around documented experience, working methods and selected work rather than agency offers. Kept the three topical distinctions: UX/product design, AI vendor evaluation/decision support, and web/brand/visual design. Page titles, descriptions, canonical URLs and hreflang sets are preserved; breadcrumb labels now describe experience while retaining their original item URLs and positions.
- Replaced animated counters with static experience indicators, preserving qualified Roche outcomes and distinguishing personal contributions from team results. Descriptions use the same Figma, adoption-feedback and prototype boundaries already approved in the main portfolio; no new commercial, certification or employment claims were introduced.
- Applied the existing portfolio type/palette to these retained pages, with square cards, native links to equivalent language pages, a keyboard skip link and direct links to relevant portfolio work. Kept the legacy graph's structure, adapting only its colours to the shared light/dark tokens. Added three subtle links within each homepage's existing detailed expertise section rather than adding new long sections.
- Restored all nine canonical pages to sitemap.xml, bringing it back to the same 14-address set found on live, with reciprocal EN/HR/DE/x-default groups and a 25 October modification date for the updated pages. Updated llms.txt and README to reflect retained experience pages, not retired agency services. robots.txt is unchanged.
- Local Cloudflare Pages runtime checks confirm canonical routes return 200 without noindex or redirects to the homepage. No-slash and index.html variants normalize once to the same retained page; query URLs remain on their own page. All 14 sitemap routes return 200/indexable in the local runtime. No publishing was performed.
- Browser checks cover the nine pages in both themes at 320, 390, 768, 1024 and 1440px, native language links, local links/anchors, persisted theme, mobile navigation, keyboard skip focus, static proof text, palette and overflow. Representative desktop/mobile screenshots were inspected. Existing homepage interaction regression was also run.
- All work remains local and uncommitted. No push, production deployment, Search Console submission, DNS or Cloudflare-account changes. The existing review server on port 3000 remains available.

Preview: `http://localhost:3000/hr/services/ux-design/?review=retained-experience-1`.

## Igor's slanted sci-fi CTA design, 2026-10-25

- Adapted the supplied `Downloads/sp_cta.svg` into the portfolio's shared CTA artwork: the original slanted main shape and detached trailing slash, with filled/outlined and dark/light variants. The original downloaded SVG is unchanged. A shared stylesheet uses nine-slice SVG painting so long labels stretch the middle rather than the cut ends; lettering remains upright, selectable native text.
- Applied to prominent native action links across the three homepages, nine retained experience pages, legal return links and the 404 page: contact/actions, hero-route calls, case narrative/detail links, section follow-ups and portfolio demo links. Primary actions use a filled gold shape; secondary navigation uses the outlined counterpart. Ordinary inline/utility/legal text links, language controls, cards, archive originals and simulation controls remain unchanged.
- Preserved all link destinations, labels, translation keys, titles and SEO metadata across the 19 documents, verified against a pre-change source snapshot. No link was replaced by an image or JavaScript-only action. The four small SVG assets inherit the approved identity through theme-specific gold/dark-gold colours.
- Added wrapping-safe spacing, minimum 44px targets, visible keyboard focus, a modest hover treatment, reduced-motion support and a native forced-colour fallback. Kept follow-up links centred and constrained to page gutters. Added a compact desktop-nav treatment between 901 and 1100px to prevent the longer English CTA crowding the wordmark without changing its text.
- Checks passed for EN/HR/DE and both themes across 320, 390, 768, 1024, 1199 and 1440px, including all hero routes and expanded case/expertise content. Checked SVG painting, label bounds/wrapping, focus, reduced motion, header separation at 901/1024/1199/1440px, AA label contrast, retained experience/legal/404 mobile layouts, original response status and missing-resource/JavaScript errors. Representative desktop/mobile screenshots were inspected; general homepage interaction regression was also run.
- This is local and uncommitted, alongside the retained-experience work. No push or Cloudflare publication/configuration changes.

Preview: `http://localhost:3000/hr/?review=sci-fi-cta-1`.

## Mobile contact CTA centring, 2026-10-25

- Corrected the fit-content contact action inside the full-width mobile menu row: at up to 900px it now uses block-level flex layout and automatic inline margins. Its label, silhouette, dimensions, colours, destination and other menu rows are unchanged; desktop rules are untouched.
- Refreshed the shared CTA stylesheet cache version to `sp-cta-2` across its existing consumers.
- Verified row-centre alignment within 1px at 320, 390, 625, 768 and 900px in EN/HR/DE and both themes, on the homepage and retained experience navigation. Checked touch target size, SVG painting, label bounds, no horizontal overflow, Escape and contact navigation/menu dismissal. Inspected the annotated-width 625px screenshot; desktop navbar regression also passed.
- Local and uncommitted only, after checkpoint `5343d5f`. No push or Cloudflare changes.

Preview: `http://localhost:3000/hr/?review=mobile-cta-center-1`.

## SVG-only contact hover, 2026-10-25

- Confirmed the legacy dark-palette navigation hover rule painted the entire rectangular anchor behind the sci-fi silhouette. Added a targeted transparent hover/active surface override for navbar sci-fi CTAs; the SVG brightness treatment and visible keyboard focus remain unchanged.
- Kept the previous mobile centring correction and refreshed the shared stylesheet cache version to `sp-cta-3` across its 19 existing HTML consumers. No labels, destinations, content or SEO changes.
- Browser checks passed in EN/HR/DE and both themes at 390, 625, 900 and 1440px: transparent anchor/row backgrounds, no rectangular shadow, SVG-only hover, retained mobile centring and visible keyboard focus, with no JavaScript errors. Inspected dark/light screenshots at the annotated 625px width.
- Local and uncommitted only. No push or Cloudflare changes.

Preview: `http://localhost:3000/hr/?review=cta-hover-1`.

## Filled hover/pressed states for outlined CTAs, 2026-10-25

- Outlined sci-fi CTAs now use the existing gold filled SVG with black native text on hover and while pressed, in both themes. They return to their theme-specific outline on release/pointer exit; the anchor remains transparent so only the slanted silhouette fills.
- Kept dimensions, wrapping, destinations, labels and primary CTA styling unchanged. Retained keyboard focus, reduced-motion behaviour and native forced-colour styling. Refreshed the shared stylesheet cache version to `sp-cta-4` across its 19 existing HTML consumers.
- Browser checks passed in EN/HR/DE and both themes at 390 and 1075px for all hero routes, a case narrative link, section follow-up and LinkedIn action: hover/press/reset, no rectangular background, unchanged geometry, keyboard focus and no horizontal overflow or JavaScript errors. Checked forced-colour fallback and inspected dark/light hover screenshots.
- Local and uncommitted only. No push or Cloudflare changes.

Preview: `http://localhost:3000/hr/?review=outline-cta-1`.

## Visible portfolio identity and manual release, 2026-10-25

- Restored the professional-portfolio tagline beneath the navbar wordmark and extended the compact desktop navigation treatment through 1199px, retaining a 16px minimum separation from navigation. EN/DE use Igor Pilicic; HR retains Igor Piličić. Corrected the remaining visible accented name in German privacy text without changing identity URLs or structured-data alternate names.
- Refreshed the CTA stylesheet cache version to `sp-cta-5`. Verified intermediate desktop navigation geometry in all languages on home/experience pages; the approved sci-fi CTA styling is unchanged.
- Prepared the new `experimental/manual-release-2026-10-25` branch and a public-file allowlist for a clean manual-upload export. Final audit suggestions are recorded separately; no additional redesign or fixes are included in this release request.
- GitHub push and downloadable package are authorized for this release. Cloudflare deployment/configuration is not; the user will perform the manual upload.

## Career alignment from the owner-approved LinkedIn brief, 2026-10-26

- Working locally on `experimental/career-alignment-2026-10-26`. Igor approved the supplied Astra MD as authoritative for LinkedIn facts; no independent authenticated LinkedIn reading is claimed.
- Corrected Intelligent Authoring to Basel and RCA to Penzberg plus Mannheim, both hybrid. Aligned Accenture's displayed title while retaining presentation and executive-support responsibilities; distinguished RCA's formal UX title from business-analysis contributions. Updated Harvey Norman's start to June 2015 and narrowed the sales wording to the retailer's iPhone 7 pre-orders.
- Applied the same content in EN/HR/DE HTML and dictionaries and llms.txt. Kept distinct Roche projects, attributed metrics, family/personal copy, prototype and Figma boundaries, existing design, URL structure and SEO metadata. Clarified brand introduction in 2026 and singular portfolio voice in the imprints.
- Availability now describes Croatia full-/part-time/contract roles across all modes and suitable European/US remote opportunities, not current worldwide client engagements or unrestricted visa eligibility.
- Language validation passed across 19 HTML files. Fresh local browser checks passed all 12 language/theme/desktop-mobile combinations, plus three JavaScript-disabled content checks. Representative screenshots inspected. Head metadata, link/asset/anchor identities, robots, sitemap and hosting rules are unchanged.
- Detailed per-ID status, copy changes and manual-only LinkedIn checklist: `docs/career-alignment-2026-10-26.md`. Privacy/analytics and earlier unrelated audit issues remain separate.
- Local and uncommitted only. No push, Cloudflare change, public upload or LinkedIn edit.

Preview: `http://localhost:3000/hr/?review=career-alignment-1#experience`.
