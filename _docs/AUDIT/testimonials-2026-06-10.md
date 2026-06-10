# Page Editor V2 Live Audit — Testimonials section

## 1. Meta
- **Target:** `testimonials` section (palette needle "Quotes or social proof")
- **Kind:** section
- **Date:** 2026-06-10
- **Audit HEAD:** `a06049ba` (snapshot; another agent may be applying 418 sanity fixes concurrently — observations reflect this snapshot)
- **Evidence:** `/home/coder/project/Coderso/.tmp/audit/evidence/testimonials.json`
- **Screenshot:** `/home/coder/project/Coderso/.tmp/audit/shots/testimonials.png`
- **Editor URL:** `http://coderso-a.localhost:5173/admin/pages/ac59f14c-d036-47de-b8e1-a8c26af75f43`
- **Public slug:** `/audit-testimonials-0610-secd`

## 2. Insert
Inserted cleanly. `editorSections=1`, `editorBlocks=2`, toolbar label **"Testimonials tools"**. Default blocks: one `heading` + one `text` (confirmed on the front `blockTypes:["heading","text"]`). Section variant options exposed: `["cards","grid","default"]` (matches `pageSectionTemplates.ts` testimonials definition, fallback `cards`).

## 3. Control inventory
The classifier reports `widget` per real DOM element. Reference control = the dedicated widget rendered by `coderso-editor-redesign.html`; verdict per the drift table.

### Layout panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Columns | number | native-number | text px input | ACCEPTABLE |
| Max width | number | native-number | text px input | ACCEPTABLE |
| Align | segmented | native-select[start\|center\|end\|stretch] | .seg pills | DRIFT |
| Justify | segmented | native-select[start\|center\|end\|between] | .seg pills | DRIFT |
| Variant | select | native-select[cards\|grid\|default] | .seg pills | PARTIAL DRIFT (functional) |

### Content panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Primary text | text | text-input | text input | OK |
| Level | select | native-select[h1..h6] | .seg pills | PARTIAL DRIFT |
| Text align | segmented | native-select[left\|center\|right] | .seg pills | DRIFT |

### Style panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Accent | color | text-input (raw hex) | .swatch color swatches + picker | DRIFT |
| Radius | number (radius) | native-number | .slider range | DRIFT (reference uses slider) |
| Shadow | select | native-select[none\|sm\|md\|lg] | .seg pills | PARTIAL DRIFT |

### Background panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Background type | select | native-select[none\|color\|gradient\|image\|video] | .seg pills | PARTIAL DRIFT |
| Background (color) | color | text-input (raw hex) | .swatch swatches + picker | DRIFT |
| Background (image/media) | media | text-input (raw URL) | media picker button | DRIFT |

### Spacing panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Top / Bottom / Left / Right | number padding | native-number | text px input | ACCEPTABLE |
| Gap | number (gap) | native-number | .slider range | DRIFT (reference uses slider) |

### Responsive panel
Empty — `fields:[]`, all counts 0. No responsive controls rendered for this section.

### Visibility panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Visible | switch | native-select[yes\|no] | .sw toggle switch | DRIFT |
| Auth only | switch | native-select[yes\|no] | .sw toggle switch | DRIFT |
| Anchor | text | text-input | text input | OK |
| Starts at | text | text-input | text input | OK |
| Ends at | text | text-input | text input | OK |

**Counts summary (all 7 panels):** `switch=0`, `swatch=0`, `range=0`, `segmentedGroup=0` across every panel. ZERO dedicated controls exist — every segmented/switch/color/media/slider control collapsed into native text / number / `<select>` primitives. Identical headline drift to all other section types, matching the user complaint ("everything is plaintext or numeric to type in").

## 4. Functional checks
- **Canvas WYSIWYG:** `canvasRedAfterBgSet=1`. Setting Background type=color → `#ff0000` immediately paints a red element on the editor canvas. The TASK-417 report flagged this BROKEN; it is now **FIXED**.
- **Variant switch (extra check):** switched Layout → Variant from `cards` → `grid`, saved + published, re-fetched front.
  - BEFORE: `data-page-variant="cards"`, inner template class `…page-section-template-testimonials-cards auto-rows-fr` (`md:grid-cols-3`).
  - AFTER: `data-page-variant="grid"`, inner template class `…page-section-template-testimonials-grid auto-rows-fr` (`md:grid-cols-3`).
  - The published front layout DOES respond to the Variant control: the `data-page-variant` attribute and the `page-section-template-testimonials-*` marker class both update. (Per `pageRendererV2.tsx`, cards and grid resolve to the same `md:grid-cols-3 auto-rows-fr` column geometry, so the structural grid is identical between these two variants — only the marker class / CSS hook differs. `default` would drop to a single column.) **Variant control works end-to-end.**

## 5. Public runtime
- **Front URL:** `http://coderso-a.localhost:3000/audit-testimonials-0610-secd`
- **sectionTypes:** `["testimonials"]`
- **blockTypes:** `["heading","text"]`
- **placeholderHits:** `[]` (none — real render, not a placeholder)
- **bodyText snippet:** `"testimonials section Add focused content blocks here."`
- Note: the driver's first front fetch returned `chrome-error://chromewebdata/` (transient editor dirty-guard navigation). A manual `front_markers` retry rendered correctly; evidence JSON `front` was corrected to the successful fetch.

## 6. Floating-panel drift vs reference
For the testimonials section the dedicated-control gaps are:
- **Align / Justify / Text align** → should be `.seg` pill buttons; rendered as native `<select>`.
- **Visible / Auth only** → should be `.sw` toggle switches; rendered as native yes/no `<select>`.
- **Accent / Background color** → should be color swatches + picker; rendered as raw-hex text inputs.
- **Background image/media** → should be a media picker button; rendered as a raw URL text input.
- **Radius / Gap** → reference uses range sliders; rendered as plain number inputs.
- **Variant / Level / Shadow / Background type** → reference uses `.seg` pills; rendered as native `<select>` (functional, partial drift).

## 7. Verdict
**PARTIAL** — severity **medium**. The Testimonials section inserts, renders on the public front with real blocks (no placeholder), WYSIWYG section background now paints on the canvas (TASK-417 regression fixed), and the Variant control changes the published layout marker. BUT every dedicated control from the reference design is missing — all segmented/switch/color/media/slider inputs collapse into native text/number/select primitives (`switch=swatch=range=segmentedGroup=0` in all 7 panels), which is the core UX complaint.
