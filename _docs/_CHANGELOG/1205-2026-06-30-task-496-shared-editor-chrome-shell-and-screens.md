# 1205. TASK-496 Shared Editor-Chrome Shell & Screens Adoption

**Date:** 2026-06-30
**Version:** Unreleased
**Tasks:** TASK-496 (01 + 02 + 03); adopts the deferred reuse intent of TASK-479-06-L06 + TASK-479-14-L02; generalizes the TASK-495 builder chrome

## Summary

One shared editor-chrome shell now serves Pages, Page Templates, **AND** Custom
Screens, with **zero dead code**. The proven TASK-495 page-editor look (separated
`rounded-2xl border bg-card shadow-card` card + in-content `PageHeader` + "Page
builder" sub-toolbar + light 280px right-docked collapsible rail + dark-correct
dotted canvas) was inlined in `PageEditor.tsx` and hardwired to `PageDocumentV2`;
it is now extracted into the shared shell and consumed by all three surfaces.
UI-only (component-boundary + visual refactor) — no data/route/RBAC/cache change;
the `ScreenDocumentV1` model is untouched. The `mode:"menu"` visual menu designer
stays entirely on its legacy dark bottom-panel path (byte-identical, not covered by
the prototype).

## Route decision (validated)

Route B — one shared **presentational** shell; Screens keep their `ScreenDocumentV1`
engine and inherit only the frame — chosen over Route A (`mode:"screen"` through
`PageEditor`, blocked by `PageDocumentV2` hardwiring) and Route C (rebuild Screens on
`PageEditor`, blocked by the same coupling + the TASK-474 boundary test). The shell
MUST live at `core/admin/ui/shared/CanvasEditor.tsx`: the
`custom-screen-authoring-boundary` test forces a neutral home (Screens can't import
`@/ui/pages`; `@/ui/authoring` can't reference pages).

## Key Changes

### Shared shell + Pages/Templates adoption (TASK-496-01)
- Revived the **orphaned** `core/admin/ui/shared/CanvasEditor.tsx` IN PLACE as the
  shell: controlled read-only `panelOpen` + `onPanelOpenChange` passthrough (host
  stays the single source of truth); header/title/badge/toolbar/canvas/panel slots;
  `panelPosition: "right" | "bottom"`. Removed the dead `BlockChip` export; reconciled
  the orphan's placeholder undo/redo + static device toggle against the wired controls
  (wired controls win).
- Routed the `PageEditor` builder branch (Pages + Page Templates) through the shell
  **behavior-preserving** — Pages byte/behaviour-identical (7/7 smoke); all
  `data-page-editor-*` hooks + `PAGE_MODEL`/cache/dirty/autosave/preview intact; the
  menu `useLegacyChrome` branch untouched.

### Screens adopt the shell (TASK-496-02)
- The Screen entry-view builder (`CustomScreenEditorPage`, List/Editor views,
  `panelPosition="right"`) and the entry content editor (`CustomScreenEntryEditor`,
  `panelPosition="bottom"`) now render through the shell matching the prototype
  (`{{ field }}` bindings).
- Kept `ScreenDocumentV1` + `ScreenFieldBinding` + content-type coupling + List/Editor
  + `ScreenRuntimeRenderer` (no schema/contract change). Retired the dark chrome:
  deleted `AuthoringFloatingToolbar.tsx`, `AuthoringCanvasFrame.tsx`, and the authoring
  `canvasChrome.ts` (the host-contract `canvasChrome?` field is a different, unrelated
  symbol — unaffected). Surviving authoring LOGIC kept: `InlineEditWrapper`,
  `authoringSelection`, `selectionChrome`/`selectionBorder`, `AuthoringLayersPanel`,
  `AuthoringCommandPalette`, `authoringCommands`.

### Dead-code sweep + closure (TASK-496-03)
- Swept the remaining editor-surface orphans: deleted
  `custom-screens/FieldBindingPanel.tsx` (binding UI lives in `ScreenBlockInspector`),
  `AuthoringInsertionZone.tsx`, and a pre-existing `shared/FilterBar.tsx` (zero
  references). **6 dead files deleted total.**
- Added a standing editor-surface dead-code **guard test** enforcing no-orphan; the
  orphan is resolved (real importers from both `ui/pages/` and `ui/custom-screens/`) —
  one shell, not two.

## Process / drift findings (preserved)
- ≥5-round **sequential** contract drift audit before implementation (converged in 6
  rounds: 10 → 4 → 6 → 2 → 1 → 0 HIGH/MED), then per-subtask post-impl audits + a
  measured light+dark visual smoke on Pages + real Screens.
- The `custom-screen-authoring-boundary` test stayed green throughout; it is what
  forces the shell's neutral `shared/` home.

## Docs / contracts
- `_docs/PAGE_MODEL.md` updated: the page-editor builder chrome is now the shared
  editor-chrome shell consumed by Pages/Templates/Screens (Pages document-model, ops,
  cache, dirty/autosave, and preview unchanged — behavior-preserving extraction).
- `_docs/ARCHITECTURE.md` updated: the editor-surface / authoring-stack map now shows
  one shared chrome shell; the dark `AuthoringFloatingToolbar` / `AuthoringCanvasFrame`
  / authoring `canvasChrome.ts` chrome is removed; surviving authoring logic retained.
- `_docs/CONTENT_TYPES_SPEC.md` — **no edit required**: TASK-496-02 did NOT refresh the
  screen contract (`ScreenDocumentV1` / `CustomScreenDefinition` / `ScreenFieldBinding`
  unchanged; Screens render through the shared shell while keeping their own engine,
  bindings, List/Editor views, and runtime).

## Validation
- `bun --cwd core lint` (zero unused imports), `bun --cwd core lint:types` — clean.
- ~200 vitest tests across the editor surface (page-editor + custom-screen suites +
  the `custom-screen-authoring-boundary` boundary test) green; no `data-page-editor-*`
  hook assertion weakened.
- `bun run gates:coderso` — 5/5. Measured light+dark visual smoke on Pages + real
  Screens; real-input playwright (swatch / URL / inline-mark + the builder right rail +
  the entry-content bottom toolbar).
