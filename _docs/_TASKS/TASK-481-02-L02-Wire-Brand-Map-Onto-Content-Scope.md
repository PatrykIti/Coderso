# TASK-481-02-L02: Wire Brand Map onto the Content Scope (Live Repaint)

# FileName: TASK-481-02-L02-Wire-Brand-Map-Onto-Content-Scope.md

**Parent Subtask:** TASK-481-02
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-481-01-L01, TASK-481-01-L02, TASK-481-02-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`
**Changelog:** 1317 (pinned; create only at TASK-481 closure)

---

## Overview

**Goal:** Paint `toPageCanvasBrandColorCssVariableMap(siteTokens)` onto the
`data-page-editor-content` scope (block + section) so block/inline brand colors
resolve the SITE value in the canvas (WYSIWYG), threaded from
`core/admin/ui/pages/PageEditor.tsx` through `SectionCanvas` into the
`renderBlockFrame` content wrapper, memoized off `useCanvasSiteTokens` so the
existing settings cache-bus live-repaints on owner token changes — with NO
setState-in-effect and NO change to the neutral `canvasSiteTokenVariables` on the
frame.

**Owning module(s) to create-or-extend:**
- `core/admin/ui/pages/PageEditor.tsx` — derive `canvasBrandTokenVariables`
  (memoized off `siteTokens` from `useCanvasSiteTokens`, alongside the existing
  `canvasSiteTokenVariables`:683 and `sitePalette`:687) and pass it to
  `SectionCanvas` (rendered :2675).
- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` — accept the brand-var map as
  a `SectionCanvas` prop and merge it onto the `data-page-editor-content` scope(s)
  created in TASK-481-01-L01 (block content wrapper + the section content wrapper).

**Source-of-truth docs:**
- `_docs/DESIGN_TOKENS.md` (canvas re-paints SITE token variables inline so it
  resolves the same effective values as the front).
- `_docs/THEMES_SPEC.md` (token merge order).
- `_docs/PAGE_MODEL.md` (block/section style model).

**Out-of-scope:** Inline-toolbar palette threading (TASK-481-03); editing
`globals.css`; touching `canvasSiteTokenVariables` neutrals (must stay byte-stable on
the frame); any sanitizer/schema change.

## Security Contract

Not a route/auth/data leaf — N/A by surface, stated explicitly:
- **Endpoint visibility / Auth / RBAC / CSRF / rate-limit:** none / unchanged. No
  new request. `useCanvasSiteTokens` consumes the ALREADY-fetched, redacted settings
  cache (`getCachedSettings` / `getSettingsCached`, key `cacheKeys.settingsRedacted`)
  via `subscribeCacheEvents`; this leaf adds no fetch and changes no authz.
- **Validation:** unchanged — values flow from `mergeTokens(DEFAULT_TOKENS,
  readSiteDesignTokenOverrides(settings))`; stored block/inline color values remain
  validated by `core/services/pages/pageAuthoringSanitizers.ts` (single owner). This
  leaf only defines the variable values the canvas resolves against, never what is
  accepted/stored.
- **Secret/PII handling:** none — reads the redacted settings cache only; nothing new
  written to cache or logs.

## Implementation Pseudocode

```tsx
// core/admin/ui/pages/PageEditor.tsx  (near :682–687)
const siteTokens = useCanvasSiteTokens();                       // existing
const canvasSiteTokenVariables = useMemo(                       // existing (neutrals+typography)
  () => toPageCanvasColorCssVariableMap(siteTokens) as CSSProperties, [siteTokens]);
const canvasBrandTokenVariables = useMemo(                      // NEW (brand)
  () => toPageCanvasBrandColorCssVariableMap(siteTokens) as CSSProperties, [siteTokens]);
// import { toPageCanvasBrandColorCssVariableMap } from "../../../ui/theme/tokenCss";
// (mirror the existing toPageCanvasColorCssVariableMap import at :128)

// pass down to each SectionCanvas (~2675)
<SectionCanvas ... contentBrandTokenVariables={canvasBrandTokenVariables} />
```

```tsx
// PageAuthoringCanvas.tsx — SectionCanvas signature: add prop
contentBrandTokenVariables: CSSProperties;

// block content wrapper (from 481-01-L01) — merge brand vars + block visual style:
<div
  data-page-editor-content="true"
  style={{ ...contentBrandTokenVariables, ...contentVisualStyle }}>
  {block.visibility.visible ? content : <HiddenBlockGhost block={block} />}
</div>

// section content wrapper (from 481-01-L01) — same brand vars so section-level
// rendered content resolves SITE brand too:
<div data-page-editor-content="true" style={contentBrandTokenVariables}>
  <PageSectionContent ... />
</div>
```

Data flow & live repaint:
- `useCanvasSiteTokens` already (a) seeds from `getCachedSettings()`, (b)
  `getSettingsCached()` on mount, (c) subscribes to `cacheKeys.settingsRedacted`
  cache events and `setSettings(cached)`. So when the owner saves new site tokens and
  the settings cache bus fires, `siteTokens` recomputes → `canvasBrandTokenVariables`
  memo recomputes → React re-renders the content scope with the new brand values.
  **No new effect, no setState-in-effect** — reuse the existing subscription; just add
  the derived memo. (This mirrors how `sitePalette`:687 already live-updates.)
- Order matters inside the content scope `style`: spread the brand var map FIRST, then
  `contentVisualStyle`, so the block's own brand reference (`color: var(--color-accent)`)
  resolves against the freshly-defined `--color-accent` on the same element.
- Do NOT add brand vars to `canvasSiteTokenVariables` (the frame map) — the frame must
  keep brand admin-resolved for chrome; brand lives only on the content scope.
- **Error handling:** none — presentational; no domain codes / `map*Error` (no route
  boundary). Offline/unauthorized falls back to `DEFAULT_TOKENS` brand via the
  existing `useCanvasSiteTokens` catch.

**Regression-test shape:** render the editor (or `SectionCanvas`) with a custom site
token fixture; assert the content scope `style` carries the site brand value (e.g.
`--color-accent: <site accent>`), the frame still carries only neutrals (no brand),
and firing a `settingsRedacted` cache event with new tokens updates the content-scope
brand value without remount.

## Testing Requirements

- Vitest lane only: `tests/vitest/ui/page-authoring-canvas.test.tsx`.
- Cases: brand var map present on block + section content scopes with site values;
  frame neutral map unchanged and brand-free; cache-bus event repaints brand (live);
  `DEFAULT_TOKENS` fallback path. Use `style`-string assertions (jsdom does not
  resolve custom properties); end-to-end colour resolution is in TASK-481-04-L01.
- No DB migration artifacts.

## Line gate / PageEditor.tsx split (shared with TASK-539-03-L03)

`core/admin/ui/pages/PageEditor.tsx` is 5,204 lines. Its cohesive split is OWNED by
TASK-539-03-L03 (the single splitter), which extracts:

- `PageEditorRoot.tsx` — the `PageEditor` component shell, canvas-frame render,
  `PageEditorColorPaletteContext.Provider`, and `SectionCanvas` mount.
- `usePageEditorController.ts` — editor state + derived canvas token variables
  (`useCanvasSiteTokens` → `canvasSiteTokenVariables` / `canvasBrandTokenVariables` /
  `sitePalette`).
- `pageEditorDocumentCommands.ts` — document mutation commands.
- `PageEditorToolbar.tsx` — toolbar + `resolveToolbarTargetLabel`.
- `PageEditorRegistryFields.tsx` — section/block registry field controls.
- `PageEditorResponsivePanel.tsx` — responsive/device panel.
- `PageEditorSettingsPanel.tsx` — settings panel.

TASK-481 does NOT re-split `PageEditor.tsx`. This leaf's brand-token edits are
confined to the brand-token content-scope SURFACE (derived token vars + palette
context + `SectionCanvas` render), which lands in `usePageEditorController.ts` and
`PageEditorRoot.tsx` after 539-03-L03's split; the `PageEditor.tsx` facade keeps the
exact pre-task public surface via named re-exports (no export-star), and consumers
keep importing `PageEditor`/`PageEditorHost`/`SectionCanvas` from the stable paths.

Land order: TASK-539-03-L03 splits `PageEditor.tsx` first; this leaf then edits the
split modules. Post-split receipt: every touched module `<=1000` lines (owned by
539's split, jointly verified at closure). This leaf must not add net lines to the
`PageEditor.tsx` facade.

## Single-writer collision guard (TASK-539-03-L03)

`PageEditor.tsx` is shared. TASK-481 owns the brand-token content-scope surface;
TASK-539-03-L03 owns the gallery/responsive surface and the facade split. Both
writers read the current on-disk state immediately before editing and never revert,
checkout, or clean up the other's uncommitted edits.

Forbidden paths for this leaf (never edit): all `_docs/_TASKS/TASK-539*` files;
`tests/vitest/ui/page-editor-v2-*.test.tsx`; and the 539-exclusive gallery/responsive
extraction modules `PageEditorRegistryFields.tsx`, `PageEditorResponsivePanel.tsx`,
`PageEditorToolbar.tsx`, `PageEditorSettingsPanel.tsx`, `pageEditorDocumentCommands.ts`.
Changelog: this family creates only `1317`; TASK-539 creates only `1318`.
