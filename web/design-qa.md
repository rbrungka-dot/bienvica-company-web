# Homepage design QA — 2026-10-18

final result: passed

## Target and approved deviations
Concept 1 is the layout target, with the editorial hierarchy of concept 3. User explicitly requires the existing owner photograph, unchanged. Current published Thai content, logos, routes, and authentication must remain. Generated concept copy, people, logos, contacts, and packaging are not source data.

## Evidence
- Selected concept: exec-d25a12d2-5b37-4117-8727-0eb7aa05afe7.png.
- Browser rendered local application through terminal.local preview.
- Combined source/implementation comparison: bienvica-qa-comparison.jpg (working capture).
- Desktop opening and complete page inspected; mobile checked in a 390px iframe with an 844px viewport. Mobile navigation expanded correctly.
- Original garden.webp SHA-256 unchanged: 59547205983fc36510daf196d2b1e3acb46b6996109cc8f7fe5e7ab4f0736802.

## Required surfaces
- Typography: locally hosted Noto Sans Thai 400/500/600; deliberate title wrapping, readable body, compact English eyebrows. Original brand wordmarks retained.
- Spacing/layout: photo-led split opening, paired botanical story, three image-led brand columns, compact community section. Single-column mobile layout; no clipped header or hero in the inspected 390px view.
- Colors: warm ivory, forest green, sage; original face photograph receives no color filters or edits. Keyboard focus styling retained.
- Imagery: owner and logos use unchanged source bytes. Three supporting botanical still lifes contain no people or fabricated product packages. Their role is mood imagery, not documentary farm evidence. Images have descriptive alt text.
- Copy: existing CMS sections retained. Empty product section omitted when there are no products. Demo preview intentionally retains its existing demo products; live data is not seeded or changed.

## Checks and limits
Existing 12 tests pass, including brand filtering/cart quantities and private admin drafts/publishing. Browser verified B-time brand link and mobile menu. No application errors observed; one extension metadata error is external to the app. Live Google authentication was not re-run; auth and server adapters are unchanged. Supporting image conversion reduced transfer size; generated image art direction is illustrative.

No P0/P1/P2 issues remain. Minor difference from image target: original person and photograph, actual logos, longer approved copy and retained origin strip require taller opening proportions; these are deliberate user/content constraints.

# About page and current range — 2026-10-18

final result: passed

Target: extend the existing approved homepage design system to About, retaining the real owner and supplied award photographs. This is a page extension, not a pixel clone of the homepage. Intentional differences: equal hero columns, longer story, award feature and four dated milestones.

Evidence:
- Source visual: /workspace/scratch/bienvica-story-style-reference.jpg (existing home design).
- Implementation: /workspace/scratch/bienvica-about-hero.jpg and /workspace/scratch/bienvica-about-award.jpg.
- Combined comparison: /workspace/scratch/bienvica-about-comparison.jpg, home and About opening regions at the same 1363×936 CSS viewport, density 1, normalized equally to 900px wide. Header account state differs because the demo admin was used during verification; no design finding attributed to that state.
- Focused award region inspected at native viewport size: complete authentic owner photo, readable award title/category, original supplied emblem; no face generation or retouching.
- Mobile: iframe 390×844; usable document width 375px after scrollbar, scroll width 375px. Menu expanded and closed, story title and body readable without overflow. Hero and award layouts stack.
- Product detail: generated twelve-bottle asset loaded at natural width 1200px; visually counted 4+4+4 bottles. Single-bottle asset inspected before integration. Legacy image replacements preserve price and stock; custom admin photographs take precedence.

Required surfaces: local Noto Sans Thai typography and weights retained; generous ivory/green spacing and thin rules match home; sage award panel and muted gold year add hierarchy; originals compressed for delivery with no face edits; dates/category copied from user supplied materials. No new medical benefit claims added.

Interactions: About navigation, timeline anchor, mobile menu, two-item demo import and product detail. Application console errors: none observed; browser extension metadata errors excluded. Sixteen tests pass, including discontinued-product checkout rejection, preservation of stock/price and custom photographs, cart behavior and private CMS drafts. Build passes.

No actionable P0/P1/P2 findings. First substantive visual comparison passed; no visual correction cycle required. The stage photo was not regenerated: authentic booth photo is used instead, as permitted by the user. Existing orders remain intact. Gift Set remains in historical/admin records but cannot appear in storefront or be quoted for a new checkout, even if its old active flag remains true.

Generated assets: web/public/assets/bienvica-single.webp and bienvica-twelve.webp, built-in image generation. Prompt set: faithful slender Bienvica 250 mL rosé bottle with pink foil, brown seal, cream copper botanical label; warm ivory studio background, soft window light, no props or advertising captions. Single image contains exactly one bottle; pack contains exactly twelve bottles in three rows of four. Reference: user supplied IMG_6230.jpeg; twelve-bottle image references the selected generated single-bottle image. Tiny label details in generated catalogue illustrations are not a substitute for the physical label.

# Scoped award mark revision — 2026-10-18

final result: passed

User directs removal of logo background, replacement of person/award photograph with that logo, and Arabic numerals throughout. Product Design scoped-edit workflow preserves surrounding page design.

Source: supplied IMG_6231.jpeg and existing award panel captured in /workspace/scratch/bienvica-award-before-mark.jpg. Implementation: /workspace/scratch/bienvica-award-mark-preview.jpg. Combined visual comparison: /workspace/scratch/bienvica-award-mark-comparison.jpg. Both desktop captures are 1363×936 CSS pixels, density 1, equally normalized to 800px wide; award section height intentionally shrinks after removing photograph/caption and duplicate miniature emblem.

Fonts/typography: existing local Noto Sans Thai retained; year reads 2569 / 2026, no Thai numerals in app source. Spacing/layout: same two-column sage panel, large contained mark left, text right; mobile stacks without overflow (390×844 iframe, document client/scroll width both 375). Colors: existing sage and forest green; gold/orange artwork from supplied emblem. Imagery: built-in image edit removed white to genuine alpha transparency; transparent WebP saved losslessly at web/public/assets/quality-award-2026-transparent.webp. Original Thai/English words, category and 2026 checked visually at full viewport and on mobile; no white rectangle. Copy/content: award information unchanged, duplicate seal and photograph caption removed. Focused native-size award screenshot used for lettering and alpha-edge review.

Build passes; browser console has no app errors, one extension metadata error excluded. Existing navigation retained. No actionable P0/P1/P2 findings. Scoped change passed first comparison without correction cycle; backend unchanged.

Image prompt (built-in imagegen): background-extraction of supplied official orange-gold Quality Award 2026 emblem; remove only white outside/inside mark and letter counters to alpha; preserve all Thai and English lettering, numerals, proportions, original layout/top caption; no redesign/retyping/recoloring/shadows. Input IMG_6231.jpeg; generated output exec-c7f819b0-509e-4409-9312-e32d5fd9caa5.png; production asset as above.
