# Audit — Cross: 3-surface parity (canvas vs preview vs front) + editor interactions + panel-shell parity

## 1. Meta
- **Dimension:** (A) canvas==preview==front visual parity for a styled section · (B) editor interactions (Cmd+K, Esc, Delete, Duplicate, drag/collapse toolbar, inline add, empty CTA) · (C) floating-panel shell parity vs reference + control-widget drift.
- **Reference:** `_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html`
- **Date:** 2026-06-10 · **Session:** `xcParity`
- **Audit HEAD (requested):** `a06049ba` ("chore(pages): close task 418 validation"). **Live tree during run:** `1fb8604a` — a concurrent agent advanced the 418 sanity work; observations reflect that snapshot.
- **Page under test:** "Audit Parity 0610 xc" (`/admin/pages/e0c92a52-dcf0-4cad-9f95-88788d35670c`), front slug `/audit-parity-0610-xc`.
- **Inserted:** Hero ("Headline, copy, and primary action") → `editorSections=1`, `editorBlocks=3` (heading + text + button), toolbar `Hero tools`.
- **Screenshots:** `.tmp/audit/shots/xcParity-canvas.png`, `.tmp/audit/shots/xcParity-preview.png`, `.tmp/audit/shots/xcParity-front-final.png`.
- **Source verified:** `core/admin/ui/pages/PageEditor.tsx` (canvas/toolbar/empty CTA lines 1775–1818, 2345–2357), `core/services/pages/pageEditorControlRegistry.ts`.

---

## (A) 3-surface parity — canvas vs preview vs front

Applied to the hero section: **background type=color, background=`#ff0000`, accent=`#00ff00`, align=center**. Then probed all three surfaces.

| Surface | Red bg renders? | Same content? | Carrier element | Verdict |
|---|---|---|---|---|
| **Canvas** | YES — `canvas_has_red = 1` | "Build with Coderso / Compose sections… / Primary action" | `DIV.grid w-full grid-cols-1 …` (child of SECTION) | OK |
| **Preview** | **N/A — preview surface is broken** | n/a | n/a | **BROKEN (env)** |
| **Front** | YES — `redCount = 1` | identical body text | **same** `DIV.grid w-full grid-cols-1 …` (child of `[data-page-section=hero]`) | OK |

### Canvas == Front: FIXED
Canvas and front paint the red background on the **exact same DOM node** — the inner `DIV.grid w-full grid-cols-1 items-center justify-start` wrapper inside the section (the outer `[data-page-section]` itself stays transparent on both surfaces). Same node, same color (`rgb(255,0,0)`), same body text, same layout. Visually confirmed in `xcParity-canvas.png` vs `xcParity-front-final.png` (both red hero, same headline/copy/button).

> **This is a FIX vs the original report §6**, which said "canvas DIVERGED from front." The shared renderer now produces byte-identical placement of the section background on both surfaces. (Note the legacy section-bg quirk: color lands on the inner grid wrapper, not the outer `<section>` — but it does so **consistently** on both surfaces, so parity holds.)

### Preview: BROKEN in this environment
Clicking **Preview** opens an in-app dialog (`role=dialog`, title "Page preview · Runtime preview (read-only, site theme)") — **not** a new tab and **not** an iframe. The dialog body shows an error placeholder:

> "**Live preview unavailable** — Preview target is not responding at `http://coderso-a.localhost:3000/preview`. Check that the public frontend is reachable."

Direct probe confirms the route is genuinely missing: `GET http://coderso-a.localhost:3000/preview` → **404 Not Found** (and `/preview/` → 404). The preview dialog contains **0 iframes, 0 images, 0 red elements** — it never renders the page. So the **middle surface cannot be visually verified**; preview is non-functional here.

**Parity result: canvas == front (FIXED). preview ≠ canvas/front (preview surface 404s — cannot render).** So full 3-surface parity is **2/3** — the two persisted surfaces match; the live-preview surface is down.

---

## (B) Editor interactions vs reference (TASK-418-03-L04 claims)

| Interaction | Expected | Result | Evidence |
|---|---|---|---|
| **Cmd/Ctrl+K** opens command palette | open palette | **WORKS** | `Control+k` → dialog appears with "SECTIONS / Hero / Content …" |
| **Esc** closes palette | dismiss | **WORKS** | after `Escape`, dialog count 1→0 |
| **Esc** clears selection | deselect | **WORKS** | with section selected, `Escape` → floating toolbar disappears ("gone") |
| **Delete** button → confirm dialog | confirm prompt | **WORKS** | "Delete selected section / This removes the selected section and its blocks… / Cancel / Delete section" |
| **Delete** keyboard key → confirm | confirm prompt | **WORKS** | pressing `Delete` on a selected section opens the same confirm dialog (no silent destroy) |
| **Cancel** on confirm | keep section | **WORKS** | sections stay = 1 |
| **Duplicate** | clone section | **WORKS** | "Duplicate section" → sections 1→2 |
| **Drag toolbar** (grip handle) | reposition bar | **WORKS** | mousedown on "Drag toolbar" grip + move → toolbar moved (388,530) → (576,336) |
| **Collapse toolbar** | hide panels | **WORKS** | "Collapse toolbar" → 7 visible panels → 0; button toggles to "Expand toolbar"; expand restores 7 |
| **"Add section"** | open palette to insert | **WORKS** (but single top-of-canvas button, not per-gap inline) | "Add section" → palette opens. Source: one `Add section` button at canvas top (`PageEditor.tsx:1797–1801`), **not** an inline `+` hover-zone between every section like the reference `.gap` insertion points |
| **Empty-section / empty-page CTA** | CTA when empty | **WORKS (empty-page)** | `PageEditor.tsx:1787–1794`: when `sections.length===0` → "This page has no sections yet." + "Add section" button (opens palette). Empty-block content panel CTA "Add block" at `2345–2357` |

**Interactions verdict: all claimed interactions function.** The only gap vs the reference is *placement* of the add-section affordance: the editor exposes a single persistent "Add section" button at the top of the canvas, whereas the reference shows an inline `+ Add section` that appears **between** sections on hover. Functionally equivalent (both open the palette), structurally lighter.

---

## (C) Floating-panel shell parity + control-widget drift

### Shell structure — STRONG parity
The live floating toolbar (`[aria-label="Hero tools"]`) mirrors the reference `.float` almost 1:1:

| Reference (`.float`) | Live editor | Match |
|---|---|---|
| dark bar `rgba(15,23,42,0.96)`, radius 16px | bg `oklch(0.129 0.042 264.695)` (≈ slate #0f172a), `border-radius:16px` | YES |
| `.grip` drag handle (6-dot) | `button[aria-label="Drag toolbar"]` (draggable, verified) | YES |
| `floatName` + `floatVariant` chip ("Hero" / "Split") | head shows "Hero …" label + variant chip "default" | YES |
| collapse (tool toggle) | `button[aria-label="Collapse toolbar"]` (verified) | YES (explicit collapse button) |
| 7 tool icons (Układ/Treść/Wygląd/Odstępy/Tło/Responsywność/Widoczność) | 7 panel buttons: Layout, Content, Style, Spacing, Background, Responsive, Visibility | YES |
| section actions: moveUp / moveDown / dup / del | "Move section up", "Move section down", "Duplicate section", "Delete section" | YES |
| Add block inside section | "Add block" button (slot CTA) | YES |

14 buttons total in the toolbar head; structural parity is essentially complete.

### Control-widget drift — HEADLINE FAILURE (everything is native select / number / text)
The reference renders dedicated controls (`.seg` pills, `.sw` toggles, `.swatch` color swatches, `.slider` range). The current editor collapses **every** control into a native `<select>`, `<input type=number>`, or `<input type=text>`. Live classifier counts for this hero's panels:

| Panel | select | number | text | range | switch | swatch | segmentedGroup |
|---|---|---|---|---|---|---|---|
| **Layout** (Columns#, Max width#, Align, Justify, Variant) | 3 | 2 | 0 | 0 | **0** | **0** | **0** |
| **Style** (Accent, Radius, Shadow) | 1 | 1 | 1 | 0 | **0** | **0** | **0** |
| **Background** (Background[color hex], Background type, Background[url]) | 1 | 0 | 2 | 0 | **0** | **0** | **0** |

`counts.switch = counts.swatch = counts.range = counts.segmentedGroup = 0` in **every** panel — exactly the user's complaint ("everything is plaintext or numeric to type in"). Per-control drift for the panels exercised:

| Control (panel) | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Align (Layout) | segmented | `native-select[start\|center\|end\|stretch]` | `.seg` pills | **DRIFT** |
| Justify (Layout) | segmented | `native-select[start\|center\|end\|between]` | `.seg` pills | **DRIFT** |
| Variant (Layout) | select | `native-select[default\|split\|centered\|full-width]` | `.seg` pills | PARTIAL DRIFT (functional, wired to front — see §D) |
| Columns (Layout) | number | `native-number` | `.seg` 1/2/3/4 pills | DRIFT (ref uses pills) |
| Max width (Layout) | number maxWidth | `native-number` | `.inp.mono` text px | ACCEPTABLE |
| Accent (Style) | color | **`type=text` raw hex** | `.swatch` color swatches + picker | **DRIFT** |
| Radius (Style) | number radius | `native-number` | `.slider` range | **DRIFT** |
| Shadow (Style) | select | `native-select[none\|sm\|md\|lg]` | `.seg` pills | PARTIAL DRIFT |
| Background (Background) | color | **`type=text` raw hex** | `.swatch` swatches + picker | **DRIFT** |
| Background type (Background) | select | `native-select[none\|color\|gradient\|image\|video]` | `.seg` pills | PARTIAL DRIFT |
| Background image (Background) | media | `type=text` raw URL | media-picker button | **DRIFT** |

---

## (D) Bonus — Variant change reaches the front (functional check)
Switched Variant `default → centered` in the Layout panel, saved, published. Front section template class changed accordingly:
- before: inner grid class `… page-section-template-hero-default …`
- after: `… page-section-template-hero-centered place-items-center text-center` (and red bg still `rgb(255,0,0)`).

So the Variant control — despite rendering as a native `<select>` instead of `.seg` pills — is **functionally wired through to the published front layout**, and the section background persists across variant changes. PARTIAL DRIFT (works, wrong widget), not BROKEN.

---

## Public runtime
- **Front URL:** `http://coderso-a.localhost:3000/audit-parity-0610-xc`
- **sectionTypes:** `["hero"]` · **blockTypes:** `["heading","text","button"]` · **placeholderHits:** `[]` (real render, no placeholders).
- **bodyText:** "Build with Coderso Compose sections and atomic blocks directly on the canvas. Primary action"
- Red section bg renders on front; accent (#00ff00) is **not** visibly applied to the button (button border/text computed `rgb(15,23,42)`, bg transparent) — accent may not be wired for this hero button on the front, a minor follow-up.

---

## Floating-panel drift vs reference (concise)
- **NO dedicated controls exist anywhere**: switch/swatch/range/segmentedGroup counts are 0 across Layout, Style, Background. Toggles → yes/no selects; colors → raw-hex text; radius/gap → number (ref slider); segmented (align/justify/columns/variant/shadow/bgType) → native select.
- **Color = raw hex text** for both Accent and Background (no swatches, no native picker) — biggest usability gap.
- **Media = raw URL text** (no media picker).
- Shell (dark bar, grip, collapse, 7 tools, section actions, label+variant chip) is faithful; the gap is entirely in the **leaf control widgets**.

---

## Verdict
**PARTIAL** — severity **HIGH**.

- **Canvas == Front: FIXED** (shared renderer, identical bg node + content; original §6 divergence resolved).
- **Preview: BROKEN** in this env (`/preview` 404 → "Live preview unavailable"), so 3-surface parity is only verifiable as 2/3.
- **All claimed editor interactions WORK** (Ctrl+K, Esc close + clear-selection, Delete confirm via button and key, Duplicate, drag, collapse/expand, Add section, empty CTA).
- **Floating-panel shell parity is strong**, but the **control-widget drift is total**: every input is a native select / number / text box — zero pills, swatches, sliders, or toggles — which is the user's core complaint and remains unaddressed. One-line why: the renderer + control registry never emit the reference's dedicated widgets, so despite a faithful dark toolbar shell and working interactions, the inspector still feels like a raw form, not the designed control surface.
