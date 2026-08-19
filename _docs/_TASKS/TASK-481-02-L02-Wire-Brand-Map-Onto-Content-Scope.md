# TASK-481-02-L02: Wire Brand Map onto the Content Scope (Live Repaint)

# FileName: TASK-481-02-L02-Wire-Brand-Map-Onto-Content-Scope.md

**Parent Subtask:** TASK-481-02
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-481-01-L01, TASK-481-01-L02, TASK-481-02-L01
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-19
**Changelog:** 1317 (created at TASK-481 closure)

---

## Overview

**Goal:** Paint `toPageCanvasBrandColorCssVariableMap(siteTokens)` onto the
`data-page-editor-content` scope (block + section) so block/inline brand colors
resolve the SITE value in the canvas (WYSIWYG), threaded from
`usePageEditorController.ts` (derivation) + `PageEditorRoot.tsx` (render — both
created by this leaf's facade split below) through `SectionCanvas` into the
`renderBlockFrame` content wrapper, memoized off `useCanvasSiteTokens` so the
existing settings cache-bus live-repaints on owner token changes — with NO
setState-in-effect and NO change to the neutral `canvasSiteTokenVariables` on the
frame.

**Owning module(s) to create-or-extend:**
- `core/admin/ui/pages/editor/usePageEditorController.ts` (created by this leaf's
  split) — derive `canvasBrandTokenVariables`
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

## Line gate / PageEditor.tsx facade split (performed HERE)

`core/admin/ui/pages/PageEditor.tsx` is 5,204 lines and this leaf edits it, so the
1,000-line gate applies at TASK-481 close. The split MUST land in this leaf (the
same shared module set TASK-539-03-L03 consumes); it is a structural extraction with
ZERO behavior change, performed before the brand-token edits below.

Extract under `core/admin/ui/pages/editor/` (preserve the facade's exact pre-task
public surface through explicit named/type re-exports; no `export *`):

| New module | Responsibility |
|---|---|
| `PageEditorRoot.tsx` | the top-level `PageEditor` component tree: toolbar/canvas/rail composition, autosave + publish orchestration, editor state host wiring |
| `usePageEditorController.ts` | editor controller hook: document state, dirty tracking, undo/redo, selection |
| `pageEditorDocumentCommands.ts` | document mutation commands: block/section add/remove/update, ordering, paste/clipboard |
| `PageEditorToolbar.tsx` | top toolbar chrome (save/publish/preview/template/status) |
| `PageEditorRegistryFields.tsx` | registry-driven inspector fields and control rendering |
| `PageEditorResponsivePanel.tsx` | responsive device toggle panel + per-device visibility |
| `PageEditorSettingsPanel.tsx` | `PageSettingsSubpanel` and page settings panels |

The facade must keep re-exporting exactly: values/functions `PageEditor`,
`PageSettingsSubpanel`, `findRecoverableAutosaveRevision`,
`resolveToolbarTargetLabel`; type `PageEditorProps`; and all ten host-contract
types (`PageEditorHost`, `PageEditorHostAppearancePanelProps`,
`PageEditorHostCanvasChromeProps`, `PageEditorHostFreshnessMode`,
`PageEditorHostLoadOptions`, `PageEditorHostPalette`, `PageEditorHostPreviewResponse`,
`PageEditorHostPublishResult`, `PageEditorHostRevisions`,
`PageEditorHostSettingsRenderProps`).

The brand-token surface this leaf edits lives in `PageEditorRoot.tsx` (the
`useCanvasSiteTokens`/`canvasSiteTokenVariables`/`sitePalette`/`SectionCanvas` render
that the split preserves at their existing locations). Land order: `Root ->
Controller -> Commands -> Toolbar -> RegistryFields -> ResponsivePanel ->
SettingsPanel -> Facade`, running `bun --cwd core lint:types` + `bun --cwd core
lint` + the owned Vitest suites after each step, then the brand-token edits on the
split modules. Post-split receipt: every extracted module and the facade is `<=1000`
physical lines (`wc -l`); the facade's 15-symbol public surface (4 values +
`PageEditorProps` type + 10 host-contract types, listed above) is byte-identical
before/after (guard with a module-boundary test). TASK-539-03-L03 consumes this
split and does NOT re-perform it.

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
// core/admin/ui/pages/editor/usePageEditorController.ts
// (post-split home of the canvas token derivation; sourced from PageEditor.tsx :682–687)
const siteTokens = useCanvasSiteTokens();                       // existing
const canvasSiteTokenVariables = useMemo(                       // existing (neutrals+typography)
  () => toPageCanvasColorCssVariableMap(siteTokens) as CSSProperties, [siteTokens]);
const canvasBrandTokenVariables = useMemo(                      // NEW (brand)
  () => toPageCanvasBrandColorCssVariableMap(siteTokens) as CSSProperties, [siteTokens]);
// import { toPageCanvasBrandColorCssVariableMap } from "../../../ui/theme/tokenCss";
// (mirror the existing toPageCanvasColorCssVariableMap import at :128)

// PageEditorRoot.tsx passes the map down to each SectionCanvas (~2675)
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

`core/admin/ui/pages/PageEditor.tsx` is 5,204 lines. THIS LEAF performs the cohesive
structural facade split BEFORE its brand-token edits (it owns the split because it
edits the file and closes before TASK-539). Extract with ZERO behavior change:

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

The `PageEditor.tsx` facade keeps the exact pre-task public surface (15 named
re-exports, no export-star): values/functions `PageEditor`, `PageSettingsSubpanel`,
`findRecoverableAutosaveRevision`, `resolveToolbarTargetLabel`; type
`PageEditorProps`; and the 10 host-contract types. Consumers keep importing
`PageEditor`/`PageEditorHost`/`SectionCanvas` from the stable paths. Guard the facade
parity with a compile-time test asserting the 15-symbol surface and with
import-identity tests at the leaf gates.

This leaf's brand-token edits are confined to the brand-token content-scope SURFACE
(derived token vars + palette context + `SectionCanvas` render) inside
`usePageEditorController.ts` and `PageEditorRoot.tsx`; TASK-539-03-L03 later REBASES
onto the split facade and does NOT re-split.

Land order: this leaf splits `PageEditor.tsx` first (receipt: facade + every module
`<=1000` lines), then performs its brand-token surface edits. Post-split receipt:
every touched file `<=1000` lines. This leaf must not add net lines to the
`PageEditor.tsx` facade.

## Single-writer collision guard (TASK-539-03-L03)

`PageEditor.tsx` is shared. THIS LEAF performs the facade split and owns the
brand-token content-scope surface; TASK-539-03-L03 later REBASES onto the split
facade and owns the gallery/responsive surface (it does NOT re-split). Both writers
read the current on-disk state immediately before editing and never revert,
checkout, or clean up the other's uncommitted edits.

Forbidden paths for this leaf (never edit): all `_docs/_TASKS/TASK-539*` files;
`tests/vitest/ui/page-editor-v2-*.test.tsx`; and the gallery/responsive SURFACES
TASK-539-03-L03 adds inside the split modules (gallery items/filter controls,
responsive-panel device logic, z-clamp rules). The 7 split modules themselves are
created here.
Changelog: this family creates only `1317`; TASK-539 creates only `1318`.
