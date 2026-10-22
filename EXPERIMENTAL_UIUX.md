# Experimental UI/UX version

Local branch: `experimental/ui-ux-redesign`
Previous review checkpoint: `3a778de` on `agent/reposition-portfolio`.
Review date: 2026-10-22.

## Four changes

1. The hero offers three keyboard-accessible paths: products and complex workflows, visual design and brand, and technical experiments. Selecting a path highlights the existing network and reveals a direct link to work. Mapped network nodes can also select a path. The mobile version uses the same text controls.
2. The profile combines biography, availability, selected organizations, and three working principles. Repeated standalone sales sections have been condensed. Detailed expertise and tools remain available under the working-method disclosures.
3. Case studies now follow the profile, before employment history. An asymmetric index uses actual existing work to help visitors find relevant evidence quickly. Existing graphic, interior, motion and game artifacts are retained.
4. The RCA case includes a native disclosure with four selectable annotations on a development-stage Figma design. Notes explain orientation, contextual guidance, structured methods and progressive disclosure. They do not claim new research findings or measured outcomes.

## Reading order

Hero > Profile > Work > Experience > Working method and toolbox > Engine > Simulation > Contact.

## Verification

- HR, EN and DE static pages and translation dictionaries.
- Browser checks at 1440px and 390px, plus overflow checks at 320px, 768px and 1024px.
- Hero mouse, canvas-node and keyboard selection; case expansion; annotations; gallery lightbox; retained tools; theme switching.
- All local anchor targets and translation keys resolve; no duplicate IDs or missing local assets were found.
- Reduced-motion behavior and light/dark layouts were exercised.

Preview: `http://localhost:3000/hr/?review=uiux-experimental`.
Cloudflare deployment remains a separate, user-approved step.
