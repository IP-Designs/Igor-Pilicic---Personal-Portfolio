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

## Spring process and Roche feedback

- Replaced the four-step index with six short, always-visible stages: understand the problem, agree on a direction, design and test, support delivery, learn from use, enable growth.
- A continuous SVG spring connects the stages, drawing once on entry. Later stages use the existing copper accent. It is decorative: no clicks, delays, autoplay presentation or hidden step content are required. Reduced motion disables drawing; the complete graphic remains visible without JavaScript.
- Desktop uses a horizontal coil; smaller screens use a vertical coil beside the same ordered text. Existing method, expertise and tools disclosures remain available.
- Roche outcome clarification supplied by Igor on 2026-10-22: colleagues told him, a few months after his engagement ended, that the RCA platform was being used by more than 10,000 users. This is reported adoption, not an intended audience or a claim about today's active-user total.
- Updated the case summary, outcome, experience, profile metric, graph tooltip and llms.txt consistently. No ownership of subsequent AI implementation or independently verified deployment-wide figures was added.
- Graphic design library > 3D animation > interior design remains the approved work-gallery order.
- HR/EN/DE checks covered translations, attributed user figures, six readable steps, desktop/mobile layout, reduced motion and completion of the entry animation. Existing hero, case study, gallery, theme and keyboard checks also passed.

Preview: `http://localhost:3000/hr/?review=spring-1#how-i-work`.
Cloudflare deployment remains a separate, user-approved step.
