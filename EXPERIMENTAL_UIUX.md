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

Preview: `http://localhost:3000/hr/?review=method-cleanup-1#how-i-work`.
Cloudflare deployment remains a separate, user-approved step.
