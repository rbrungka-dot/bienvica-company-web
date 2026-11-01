# Research layout correction — 2026-11-01

Source visual: /workspace/scratch/104ab2a7e113/upload/IMG_6431.jpeg (2360×1640 annotated user screenshot).
Implementation: http://terminal.local:4173/#/research?section=shot, browser screenshots /workspace/scratch/bienvica-hero-layout-v2.jpg and /workspace/scratch/bienvica-glp-layout-v2.jpg (1348×925 viewport at 1×).
Responsive evidence: /workspace/scratch/bienvica-mobile-hero-v2.jpg, /workspace/scratch/bienvica-mobile-graph-v2.jpg, /workspace/scratch/bienvica-mobile-nutrition-v2.jpg (390 CSS px iframe); /workspace/scratch/bienvica-tablet-hero-v2.jpg (1024 CSS px iframe).
Comparison inputs: /workspace/scratch/bienvica-hero-comparison.jpg; /workspace/scratch/bienvica-graph-comparison.jpg. Source and implementation were scaled to a common comparison canvas; source hero is partially scrolled and contains red annotation. Judge placement against the arrow rather than matching that crop as new artwork.

## Findings and fixes
1. P1: GDA was a separate full-width section. Moved to 9.2% left, 80.3% top, 37.2% width inside original hero. Rechecked desktop, 390px and 1024px. It remains beneath the icons and clear of the bottle/glass.
2. P2: Captions ran across entire cards at small, similar sizes. Added a 62ch reading measure, clear labels for findings and scope, 16px primary / 14px secondary text (15px / 13px mobile), consistent paragraph spacing and divider. Graph data images unchanged.
3. P2: GLP-1 abbreviations and production details interrupted the reading flow. Retained them in a native expandable details section.
4. P2: Tiny nutrition copy in scaled hero. Entire GDA opens a labeled native modal with readable values; close and focus return verified in desktop/mobile. Centered enlarged values after first screenshot showed left alignment.

## Required surfaces
- Typography: existing Noto Thai families preserved; secondary research, enzyme and FAQ copy enlarged. Wrapping inspected in desktop and mobile screenshots.
- Spacing: graph width constrained; captions aligned to consistent measure; outer card padding and heading gaps checked. No horizontal overflow in 1024px DOM check; mobile screenshot remains within iframe.
- Color: original cream/rose palette retained with darker caption copy and warm light separators.
- Assets: original hero/mixing/research images preserved. No graph values, error bars or significance marks changed.
- Copy: factual scope retained; calculations and FAQ maintained. No personal lab-report files added.

## Interactions and limitations
Nutrition open/close tested at desktop and 390px; native accordion and original graph links preserved. Existing 38 tests and build passed. Browser logs showed extension metadata errors only, no application errors observed. Responsive checks use real 390px and 1024px nested browser viewports, not physical devices. Small original GLP-1 raster resolution remains a source limitation.

final result: passed
