# TASK-481: Page Editor Canvas Brand-Token WYSIWYG

# FileName: TASK-481_Page_Editor_Canvas_Brand_Token_WYSIWYG.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-477-02 (canvas neutral tokens + live swatch palette); coordinate with TASK-479-05-L03 + TASK-479-08-L02 (shared `@theme` brand vars + `data-page-editor-canvas-frame` — non-blocking; see "Cross-task coordination")
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

Make **brand** block/inline colors (primary / secondary / accent / border) render
in the page-editor canvas with the **same** effective value the front uses, so the
canvas is true WYSIWYG for brand colors — not just neutrals.

TASK-477-02 closed the neutral half: the editor canvas frame now carries the site
`--color-bg/-surface/-text`, and block-level swatch previews reflect the live
palette. Brand colors were explicitly left as a follow-up — this task.

## Problem (root cause)

The admin shell's Tailwind `@theme` block in `core/admin/styles/globals.css` (the
brand `--color-primary/-secondary/-accent/-border` declarations inside `@theme {`)
maps those brand colors from the **admin** shadcn theme globally. Those declarations win inside the canvas, so a block whose color
token is e.g. `accent` resolves `var(--color-accent)` to the admin value
(near-white) in the editor while the front resolves it to the **site** token
(e.g. orange `#f59e0b`).

TASK-477-02 deliberately did **not** re-emit brand `--color-*` on the canvas frame
because the editor *chrome* (selection rings via `ring-primary`, block outlines,
ghost "+" tiles, focus borders) also consumes those same variables — overriding
them on the frame would recolor the chrome to the site brand and break the editor
look. So neutrals (which no `core/admin/ui/pages` chrome consumes) were safe to
emit on the frame, but brand was not.

Net symptom for the owner: a brand swatch *previews* the correct site color
(matches the front) but a brand color *applied* to a block renders admin-themed in
the editor (mismatch). Inline (477-01) and block-level (477-02) previews are also
internally inconsistent for brand (inline previews `var()` = admin-resolved;
block-level previews the site `previewValue`) — unifying them depends on this fix.

## Proposed approach (to refine during pre-implementation audit)

Emit the site brand `--color-*` on a **content-only scope** that excludes editor
chrome, instead of the shared canvas frame:

- Identify (or introduce) a wrapper that contains only rendered page content
  (the block render tree) and **not** the chrome layers (selection overlay,
  outlines, ghost insert tiles, toolbars). Candidate: a dedicated
  `data-page-editor-content` element inside the existing
  `data-page-editor-canvas-frame`, with chrome rendered as siblings/overlays
  outside it.
- Apply the full site color map (brand + neutrals, e.g.
  `toPageCanvasColorCssVariableMap` extended or `toCssVariableMap`) on that
  content scope only. Frame keeps neutrals as today for any frame-level content.
- Verify the chrome still reads the **admin** brand vars (rings/outlines/tiles
  unchanged) because chrome lives outside the content scope.
- Re-unify the swatch preview strategy once brand resolves to the site value in
  both contexts: inline + block-level previews should agree (prefer the site
  token preview, which now also matches the in-canvas render).

Reuse: `toCssVariableMap` / `toPageCanvasColorCssVariableMap` (`core/ui/theme/tokenCss.ts`),
`getPageEditorColorPalette(tokens)`, `PageEditorColorPaletteContext` (already added
in 477-02), `mergeTokens`, `readSiteDesignTokenOverrides`.

## Success criteria

- A brand color (primary/secondary/accent/border) applied to a block renders the
  **site** token value in the canvas, matching the front for the same page.
- Editor chrome is visually unchanged: selection rings, block outlines, ghost
  "+" insert tiles, focus borders, toolbars keep the admin theme (no brand
  bleed onto chrome).
- Inline and block-level brand swatch previews agree with each other and with the
  in-canvas render (no preview/apply mismatch).
- Neutrals continue to work as shipped in 477-02 (no regression).

## Scope

**In scope (what this feature task adds):** brand block/inline colors
(primary/secondary/accent/border) resolve the SITE token value in the editor canvas
(true WYSIWYG matching the front), via display-only token threading onto a
content-only scope, without recoloring editor chrome.

**Out of scope:** routes/auth/RBAC/schema/cache changes; renaming color tokens;
editing `core/admin/styles/globals.css` `@theme {` (owned by TASK-479-05-L03); the
`data-page-editor-canvas-frame` chrome restyle (owned by TASK-479-08-L02). Values
remain validated by the existing page-color sanitizer allowlist
(`authoringColorTokenNames` in `core/services/pages/pageAuthoringSanitizers.ts`).

**What TASK-479 reskin already covers vs what this task adds:** TASK-479 reskins admin
chrome (the `@theme`/dark mapping and the canvas-frame visual tokens) but makes NO
preview-token-semantics change — it leaves the canvas brand/neutral emission in
`core/ui/theme/tokenCss.ts` untouched. This task owns the brand-emission /
content-scope behavior change.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-481-01 | Content-Scope Extraction & Chrome Isolation (foundation) | Medium | ⏳ To Do |
| TASK-481-02 | Brand-Token Canvas Emission & Live Wiring | Medium | ⏳ To Do |
| TASK-481-03 | Editor-Control Preview Unification | Small | ⏳ To Do |
| TASK-481-04 | WYSIWYG Tests, Docs & Closure | Small | ⏳ To Do |

Leaves: 01 → L01 (`data-page-editor-content` wrapper), L02 (admin brand-var
re-assertion on chrome), L03 (characterization tests); 02 → L01
(`toPageCanvasBrandColorCssVariableMap` + contract tests), L02 (wire brand map onto
the content scope, live repaint); 03 → L01 (live palette into inline text-color
toolbar), L02 (inline+block+canvas preview agreement test); 04 → L01 (brand-WYSIWYG
vitest + real-input Playwright smoke), L02 (docs + TASK-479 reciprocity).

> Implementation note: the real canvas code lives in
> `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` (`SectionCanvas` /
> `renderBlockFrame`) — NOT a top-level `core/admin/ui/pages/PageAuthoringCanvas.tsx`.
> Block brand visual style (`toPageBlockStyle`, `core/services/pages/pageRendererV2.tsx`)
> is applied on the same frame `<div>` as the chrome, so 481-01-L01 co-locates that
> visual style with the content scope while layout/chrome stay on the frame.

## Risks / constraints

- The frame currently mixes content + chrome; splitting them is the main risk.
  If a clean content-only scope is not feasible without a structural refactor,
  split into child tasks (e.g. `TASK-481-01` content-scope extraction,
  `TASK-481-02` brand emission + preview unification).
- Do **not** rename color tokens — the name contract (palette = sanitizer
  allowlist = `tokenCss` = `DESIGN_TOKENS.md`) is already consistent.
- Chrome-safety must be re-verified by grepping `core/admin/ui/pages` for
  `var(--color-primary|secondary|accent|border)` consumers before emitting brand.

## Cross-task coordination (TASK-479)

This task overlaps two TASK-479 admin-redesign leaves on the **same** files/regions,
so the two programs must not double-edit those regions uncoordinated (each 479 leaf
carries the reciprocal note):

- **TASK-479-05-L03** (`_docs/_TASKS/TASK-479-05-L03-Globals-Css-Mapping-And-Dark-Mode.md`)
  edits the **same `@theme {` block** in `core/admin/styles/globals.css` (wiring
  `--admin-*`→shadcn vars + the dark layer). That leaf makes **no preview-token
  semantics change** — it leaves the canvas brand/neutral emission in
  `core/ui/theme/tokenCss.ts` (`toPageCanvasColorCssVariableMap`) untouched. TASK-481
  owns the brand-emission change; the edits to the `@theme` brand `--color-*`
  declarations must be a single coordinated change of that region, not two competing
  rewrites.
- **TASK-479-08-L02** (`_docs/_TASKS/TASK-479-08-L02-Page-Editor-Floating-Canvas.md`)
  restyles the **same `data-page-editor-canvas-frame`** (canvas chrome / visual tokens
  only) and explicitly keeps `canvasSiteTokenVariables` and the
  `data-page-editor-canvas-*` contract intact so TASK-481 can layer its brand-token
  WYSIWYG onto the same frame.

**Sequencing:** let 479-08-L02 land the restyled `data-page-editor-canvas-*` shape
first, then this task introduces the content-only scope + brand emission on that
frame; align the `@theme` brand-`--color-*` edit with 479-05-L03. No `--admin-*` /
dark-mode or `canvasSiteTokenVariables` semantics change on the 479 side — the only
brand/WYSIWYG behavior change is owned here.

## Testing Requirements

- Vitest lane only (pure admin-UI render + pure-TS token contracts; no runtime/route/
  DB dependency): extend the existing
  `tests/vitest/ui/page-authoring-canvas.test.tsx`,
  `tests/vitest/ui/themeTokens.test.ts`, and
  `tests/vitest/ui/shared-color-control.test.tsx`.
- Coverage: content-scope/chrome isolation + admin re-assertion (01); brand map
  contract + live cache-bus repaint on the content scope (02); inline↔block↔canvas
  brand preview agreement (03); end-to-end brand WYSIWYG + neutral non-regression (04).
- Real-input Playwright smoke via the `playwright-cli` skill (synthetic-event tests
  alone are insufficient — memory `page-editor-color-toolbar-live-findings`).
- No Bun lane (no runtime/route/plugin-lifecycle/security/perf surface); no DB
  migration artifacts (display-only token threading, no schema/DB change).

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md`: brand-vs-neutral canvas resolution model (content scope
  emits brand, frame emits neutrals, chrome re-asserts admin) + the explicit note
  that TASK-481 did NOT edit `globals.css @theme` (TASK-481-04-L02).
- Reciprocity with TASK-479-05-L03 (`@theme`/dark owner) and TASK-479-08-L02
  (canvas-frame restyle owner) — referenced, not edited, from TASK-481.

## Notes

- Do NOT create changelog entries or edit `_docs/_TASKS/README.md` (orchestrator
  syncs the board).
- This is display-only token threading: no routes/auth/RBAC/schema/cache changes;
  values stay sanitized via the `authoringColorTokenNames` allowlist +
  `pageAuthoringSanitizers`.

## References

- TASK-477-02: `_docs/_TASKS/TASK-477-02-Block-Level-Panel-Swatch-Preview-Accuracy.md`
  (neutral fix + live palette threading; this task continues it for brand).
- `core/ui/theme/tokenCss.ts` — `toPageCanvasColorCssVariableMap`, `toCssVariableMap`.
- `core/admin/styles/globals.css` — the `@theme {` block's brand `--color-*` mapping
  (`--color-primary/-secondary/-accent/-border`; the source of the in-canvas brand
  override). Cite by the `@theme {` anchor, **not** line numbers — TASK-479-05-L03
  edits this same region (see "Cross-task coordination").
- `core/admin/ui/pages/PageEditor.tsx` — canvas frame (`data-page-editor-canvas-frame`),
  `useCanvasSiteTokens`, `PageEditorColorPaletteContext`.
- Live evidence (2026-06-27): in-canvas `var(--color-accent)` resolved to admin
  near-white while the site/front token + swatch preview showed orange.
