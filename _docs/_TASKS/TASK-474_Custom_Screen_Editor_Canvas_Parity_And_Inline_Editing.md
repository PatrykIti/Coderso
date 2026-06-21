# TASK-474: Custom Screen Editor Canvas Parity & Inline Editing
# FileName: TASK-474_Custom_Screen_Editor_Canvas_Parity_And_Inline_Editing.md

**Priority:** High
**Category:** Admin UI / Custom Screens / Authoring UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-468-04 (Done), TASK-468-05 (Done); coordinates with TASK-473 (per-record presentation-override storage) for TASK-474-03 / TASK-474-06
**Status:** ⏳ To Do
**Created:** 2026-06-21

---

## Overview

TASK-468-04 and TASK-468-05 closed the Custom Screens V4 cutover, but they
**deliberately deferred** the authoring UX that the owner actually expects:

- TASK-468-04 closed with *"List View configuration remains unchanged and
  table-only."*
- TASK-468-05 closed with *"the records list remains the existing table/list
  workflow"* and punted per-record text-size/image/style persistence to
  TASK-473.

The result is three Custom Screen surfaces that diverge from the **Pages editor**
(the agreed reference for "interactive canvas + floating panel"). This task owns
the **UX completion** the owner described (paraphrased):

1. **List View editor** must work like the Pages editor — an interactive canvas
   with a single floating bottom toolbar scoped to list-view options; the left
   ("List elements") and right (Screen / Selected Column) side panels disappear.
   The records still present as a table, **and** the owner wants to click a value
   in a row and edit it inline in place (owner decision 2026-06-21). So List View
   gets both the canvas chrome *and* inline per-row value editing (TASK-474-06).
2. **Editor View** must stay an interactive canvas + floating panel but become
   more advanced — each control opens a **modal**, and the canvas styling /
   behavior must match the Pages editor (today it diverges).
3. **Per-record target view** (entry editor) must stop over-bordering every block
   and must let the user **click a text on the canvas and edit only that bound
   field inline** — not open a detached "Value" modal/panel.

### Root architectural cause

Two compounding causes, both verified in code:

1. **Parallel reimplementation under a hard import boundary.** The Custom Screen
   authoring stack (`ScreenAuthoringCanvas.tsx`, `ScreenRuntimeRenderer.tsx`,
   `CustomScreenEntryCanvas.tsx`) was built as a **separate** renderer from the
   Pages editor (`PageAuthoringCanvas.tsx`, `pageInlineEditContract.ts`). The
   boundary test `tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
   (verified) **forbids** custom-screens from importing `@/ui/pages` and forbids
   the neutral `core/admin/ui/authoring/*` package from importing `/pages/`,
   `services/pages`, `customScreens`, widgets, db, server, or Bun. So the
   genuinely reusable Pages capabilities (inline canvas text editing, a single
   selection ring, an attached expandable toolbar subpanel, the `controlChrome`
   style tokens) **cannot be imported directly**. The screen renderer therefore
   re-derived weaker versions: `record-header` titles render as a read-only
   `<h2>` (`ScreenRuntimeRenderer.tsx:208`) and the field inline path is gated
   behind `enableInlineFieldEditing`, which `CustomScreenEntryCanvas.tsx:36`
   never passes. The neutral `authoring/*` package exists but stops short of an
   inline-edit primitive and a selection-border token, so each editor owns its
   own.
2. **Explicit 468 scope cuts** (quoted above) left the List View as a 3-pane
   `EditorShell` builder and the entry editor routed through a detached "Value"
   panel.

The visible "everything is bordered" symptom is one consequence of (1): for one
block the borders stack **four deep** —
`AuthoringCanvasFrame` outer border (`AuthoringCanvasFrame.tsx:20`) →
`<section>` border (`ScreenRuntimeRenderer.tsx:365`) →
block wrapper border (`ScreenRuntimeRenderer.tsx:144-145`) →
inner content card border (`ScreenRuntimeRenderer.tsx:202/234/304/318/326`) —
versus the Pages editor's single outline ring.

### Live evidence captured this session (playwright-cli)

Verified on screen **House Projects** (`a66a7d0f-8341-4600-8f44-ff740f66a1ba`),
entry **Dom Aurora 148** (`c8f0e3fa-5c2e-496d-9395-3c8d7292ca25`); screenshots in
`.tmp/task468-audit/`:

| View | Route | Observed |
|---|---|---|
| List View editor | `/advanced/custom-screens/:id` | 3-pane: left "List elements" add-button library, center table, right inspector (tabs Screen / Selected Column). |
| Editor View | same, Editor View tab | Canvas + dark floating pill toolbar (Insert, Layers, Content, Binding, Style, move/dup/delete); **nested borders**; panels open as a detached top-right box. |
| Per-record | `/entries/:entryId` | 3 nested rounded borders for one block; selecting it shows a "RECORD-HEADER" pill → detached top-right **Value** panel with a Title input; **no inline edit** of the on-canvas heading. |
| Pages editor (reference) | `/pages/:id` | Full-width dotted canvas, **no rails**; dark floating toolbar docked to the selected block with an **attached** expandable Content panel; single clean selection ring; **inline** on-canvas H1 editing. |

### Scope boundary vs TASK-473

TASK-473 owns the **storage/API contract** for per-record presentation overrides
(image/text-size/style persisted outside `content_entries.data`). TASK-474 owns
**UX only**: de-bordering, inline field-value editing through the existing entry
draft path, the List View canvas chrome, and Editor View page-parity. Where
per-record *presentation* (not field value) persistence is required, TASK-474
depends on TASK-473 rather than duplicating its storage.

## Sub-Tasks

Sequenced by dependency. TASK-474-01 is the mandatory neutral-extraction
foundation; 02/03 (de-border + inline edit) and 04/05 (list/editor chrome) build
on it; 06 (list-row inline editing) is **confirmed in scope** (owner decision
2026-06-21) and coordinates its storage with TASK-473.

- [ ] **TASK-474-01: Extract neutral authoring primitives.** In
  `core/admin/ui/authoring`, add (a) a document-agnostic `InlineEditWrapper`
  (`contentEditable` + `onStartEdit`/`onCommit` + Enter/Escape/blur, mirroring
  the Pages `InlineEditableCanvasText` but with **no** `PageBlockV2` /
  `services/pages` dependency), (b) a `SelectionBorder` class-map/token (level
  `container | item`, `selected`, `editing`) replacing the hand-rolled
  `ring-2 ring-primary/35`, (c) a neutral canvas-chrome token module mirroring
  `pages/editorControls/controlChrome.ts` (which is boundary-forbidden to
  import), and (d) an **attached expandable subpanel** slot on
  `AuthoringFloatingToolbar` / `AuthoringCanvasFrame`, plus a borderless mode on
  `AuthoringCanvasFrame` (opt-out prop, default preserves current behavior). The
  package stays UI-only so the boundary test stays green.
- [ ] **TASK-474-02: Collapse nested borders to one selection ring** across
  `ScreenRuntimeRenderer` (builder + entry modes) and the entry/editor canvas
  frames, using the `SelectionBorder` token and the borderless `CanvasFrame`
  mode. Mode-gate so preview / `CustomScreenPreview` / workspace preview dialog
  do not regress.
- [ ] **TASK-474-03: Per-record inline click-to-edit; retire the detached Value
  panel.** Pass `enableInlineFieldEditing` through `CustomScreenEntryCanvas`;
  wire `record-header` title/eyebrow/subtitle and writable field blocks to the
  neutral `InlineEditWrapper`; commit through the existing
  `handleTitleChange` / `handleSlugChange` / `handleFieldChange`; fail-closed on
  read-only / unbound bindings; remove (or demote to read-only) the detached
  `valuePanel` + `renderSelectedBlockBindingEditor`.
- [ ] **TASK-474-04: List View editor → canvas + floating bottom bar, remove
  rails.** For `activeBuilderTab === "list-view"` render `ListViewCanvas` inside
  `AuthoringCanvasFrame` with an `AuthoringFloatingToolbar` whose panels hold
  **only** list-view options (Elements, Column inspector, List settings,
  Hidden columns); remove the `EditorShell` `leftPanel`/`rightPanel` and the
  mobile Sheets for list-view mode; relocate screen metadata to a settings
  affordance.
- [ ] **TASK-474-05: Editor View page-parity.** Move panels onto the attached
  expandable subpanel (off the detached top-right box); upgrade
  `AuthoringCommandPalette` to a real focus-trapped `Dialog`/`Sheet`; make the
  advanced control groups open in **modals** (owner requirement); apply the
  shared canvas-chrome tokens for visual parity with Pages.
- [ ] **TASK-474-06: List View inline per-record row editing** (confirmed in
  scope, owner decision 2026-06-21). Enable clicking a value in a list row and
  editing it inline. Requires an additive row-template document + bindings on the
  V4 list-view definition, a normalizer + V1/V2/V3 migration that backfills a
  default row document from the visible columns, and a list-row binding resolver;
  wire `ListViewCanvas` rows to the neutral `InlineEditWrapper`. **Field values**
  persist through the existing content-entry write path (they are content data,
  not presentation); only per-record *presentation* overrides (if any) defer to
  TASK-473's storage. Land after 474-01 (primitive) and 474-04 (list canvas).

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/authoring/index.ts` | Export `InlineEditWrapper`, `SelectionBorder` token helper, neutral chrome tokens, attached-subpanel types. |
| `core/admin/ui/authoring/InlineEditWrapper.tsx` *(new)* | UI-only inline contentEditable primitive (no `PageBlockV2` / `services` deps). |
| `core/admin/ui/authoring/selectionChrome.ts` *(new)* | Single `SelectionBorder` class-map (container/item, selected, editing). |
| `core/admin/ui/authoring/canvasChrome.ts` *(new)* | Neutral copy of `controlChrome`-style tokens (boundary-safe). |
| `core/admin/ui/authoring/AuthoringCanvasFrame.tsx` | Borderless opt-out prop; attached-subpanel slot instead of detached top-right box. |
| `core/admin/ui/authoring/AuthoringFloatingToolbar.tsx` | Attached expandable subpanel slot adjacent to the toolbar. |
| `core/admin/ui/authoring/AuthoringCommandPalette.tsx` | Real `Dialog`/`Sheet` (focus-trap, Escape). |
| `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | De-border to one ring; inline `record-header` + writable field via `InlineEditWrapper`; keep preview mode read-only. |
| `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx` | Pass `enableInlineFieldEditing`; borderless frame. |
| `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | Remove/demote detached `valuePanel` + `renderSelectedBlockBindingEditor`; route commits through existing handlers. |
| `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx` | Borderless frame; attached subpanel; shared chrome tokens. |
| `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` | Advanced control groups open in modals. |
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | List-view tab → `AuthoringCanvasFrame` + floating toolbar; remove `EditorShell` rails + mobile Sheets for list-view; relocate screen metadata. |
| `core/admin/ui/custom-screens/ListViewCanvas.tsx` | Render inside `AuthoringCanvasFrame`; on-canvas column select/reorder/visibility. |
| `core/admin/ui/custom-screens/ListViewElementLibrary.tsx` / `ListViewColumnInspector.tsx` / `ListViewDesigner.tsx` | Render cleanly as floating-panel content; `ListViewDesigner` re-scoped to list settings only (no screen-name/content-type/sidebar metadata). |
| `core/admin/ui/custom-screens/EditorViewDesigner.tsx` | **Dead code** (referenced only by itself) — delete. |
| `core/services/customScreens/customScreenSchemas.ts` / `bindingResolver.ts` / `customScreenListModel.ts` | **474-06 only**: additive list-view row-template document + bindings + migration. |
| `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` | Extend to also forbid new neutral primitives importing `/pages` or `/customScreens`. |
| Custom Screen editor/runtime UI tests | Cover canvas+floating-bar list view, single-ring de-border, inline entry edit, panel/palette refactor. |

## Implementation Pseudocode

Neutral inline-edit primitive (UI-only; no `services/pages` import):

```tsx
// core/admin/ui/authoring/InlineEditWrapper.tsx
export function InlineEditWrapper({
  value, editable, onCommit, as: Tag = "span", className,
}: {
  value: string; editable: boolean;
  onCommit: (next: string) => void;
  as?: keyof JSX.IntrinsicElements; className?: string;
}) {
  if (!editable) return <Tag className={className}>{value}</Tag>; // fail-closed
  return (
    <Tag
      className={className}
      contentEditable suppressContentEditableWarning
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === "Escape") { e.currentTarget.textContent = value; e.currentTarget.blur(); }
      }}
    >{value}</Tag>
  );
}
```

De-bordered selection token + record-header inline edit (replace nested frames):

```tsx
// ScreenRuntimeRenderer.tsx — single ring, no nested cards
const wrapperClass = cn(selectionBorder({ level: "item", selected, editing: canEdit }));
// record-header: was a read-only <h2>; now inline when enabled + writable
<InlineEditWrapper as="h2" value={title}
  editable={mode === "entry" && enableInlineFieldEditing && titleWritable}
  onCommit={(next) => onTitleChange?.(next)} />
```

List View tab → canvas + floating bottom bar (remove rails):

```tsx
// CustomScreenEditorPage.tsx
activeBuilderTab === "list-view" ? (
  <AuthoringCanvasFrame
    borderless
    toolbar={<AuthoringFloatingToolbar label="List view" panels={listViewPanels} />}
    floatingPanel={activeListPanel}      // attached subpanel, not EditorShell rail
  >
    <ListViewCanvas {...listViewCanvasProps} />
  </AuthoringCanvasFrame>
) : (
  <ScreenAuthoringCanvas {...editorViewProps} />
)
// EditorShell leftPanel/rightPanel + mobile Sheets removed for list-view mode.
```

## Security Contract

- **Endpoint visibility:** unchanged — existing internal admin Custom Screen and
  content-entry routes. No new public path. TASK-474-01..05 add no endpoints.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` to load editor/record; `content:write` to save entry
  field values and screen definitions. Inline edit must respect binding `mode`
  (`read` bindings render no editable affordance — fail-closed).
- **CSRF:** required for entry/definition writes (unchanged).
- **Rate-limit:** existing admin read/write buckets.
- **Reject unknown:** entry writes continue through existing content-entry
  schemas; the screen renderer cannot bypass service validation. **474-06** must
  keep `rejectUnknownKeys` on the list-view definition and add only additive,
  backward-compatible fields with normalizers + migration.
- **Secret handling:** inline editing and floating panels must not surface
  protected settings, credentials, CSRF tokens, or privileged values beyond the
  current admin session.

## Testing Requirements

- Keep `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` green after
  **every** subtask; extend it to forbid the new neutral primitives importing
  `/pages` or `/customScreens`.
- Extend `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`: List View tab
  renders `AuthoringCanvasFrame` + a single floating toolbar and renders **no**
  `data-editor-shell-left-panel` / `right-panel` and no mobile Sheets.
- New entry inline-edit vitest: render `CustomScreenEntryEditor` with a writable
  title binding, click the on-canvas heading, type, blur → assert
  `handleTitleChange` fired and `buildEditorViewUpdatePayload` carries the new
  title; assert read-only bindings render no `contentEditable`.
- De-border guard: assert a selected block has exactly one selection-ring
  ancestor and no nested rounded-border ancestors.
- Reuse `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
  and `custom-screen-editor-binding-flow.test.tsx` for selection/binding/save.
- **474-06 only:** extend `tests/vitest/admin/custom-screen-schemas.test.ts` for
  additive row-template normalization + V3/V4 flat-column migration round-trips +
  unknown-key rejection.
- Live playwright-cli on `House Projects` `a66a7d0f` / entry `Dom Aurora 148`:
  (1) List View shows canvas + floating bar, no rails; (2) Editor View shows a
  single clean selection ring + attached toolbar subpanel; (3) clicking the
  "Dom Aurora 148" heading edits inline with no detached Value panel;
  (4) cross-check against `/pages/:id`.
- Gates after each subtask: `bun run check:admin-boundary`,
  `bun --cwd core build:admin`, `bun run check:admin-bundle`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, vitest, `git diff --check`.

## Risks

- **Boundary regression:** importing `@/ui/pages` from custom-screens (or vice
  versa, or pulling `services/pages` into `authoring/*`) breaks the boundary
  test. The neutral-extraction approach (474-01) is mandatory and must itself
  avoid `/pages`, `/customScreens`, services, and Bun imports.
- **Shared-renderer blast radius:** `ScreenRuntimeRenderer` serves
  `builder`/`preview`/`entry` modes **and** `CustomScreenPreview` + the workspace
  preview dialog. De-border / inline changes must be mode-gated so non-editor
  surfaces do not regress.
- **Inline edit must fail-closed:** read/unbound bindings must render no
  `contentEditable`, or read-only fields become accidentally editable.
- **Rail removal:** deleting the List View mobile Sheets + `EditorShell` rails
  must not lose the content-type/status/sidebar controls (relocate them) or
  mobile/responsive coverage.
- **474-06 schema:** the V4 list-view definition is guarded by `rejectUnknownKeys`
  and multiple normalize/migrate paths; a mis-specified field throws
  `custom_screen_definition_invalid` on existing records. Additive +
  backward-compatible only, coordinated with TASK-473 storage.
- **Definitions written by the old 3-pane flow** must keep loading after the UX
  change (read-repair paths preserved).

## Open Decisions (owner)

1. ~~**List View scope**~~ — **RESOLVED 2026-06-21:** chrome parity **plus** inline
   editing of record values inside the list canvas → TASK-474-06 is in scope
   (additive V4 schema + TASK-473 coordination for any presentation overrides).
2. **Screen metadata home** once the right rail is gone: a settings modal/panel on
   the floating bar (*recommended*) or the topbar?
3. ~~**Editor View modals**~~ — **RESOLVED 2026-06-21:** only the advanced
   (typography/style) groups become modals; simple controls stay inline in the
   attached panel.
4. **Detached Value panel:** fully remove (*recommended*), or keep read-only for
   inspecting read-mode/unbound bindings that have no inline affordance?
5. **TASK-473 timing:** 474-03 persists only field values today; per-record
   *presentation* persistence requires TASK-473 — land before or after?

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (neutral authoring primitives + boundary).
- `_docs/CMS_SPEC.md` (Custom Screen authoring UX).
- `_docs/CMS_API.md` (474-06 only, if list-view schema changes).
- `_docs/_TASKS/README.md` and the open-tasks roadmap.
- `_docs/_CHANGELOG/` + `_docs/_CHANGELOG/README.md` on closure.

## Acceptance Criteria

1. The Custom Screen List View editor is an interactive canvas with a single
   floating bottom toolbar and **no** left/right rails; records still present as
   a table; all column add/reorder/visibility/formatter/sort/filter/bulk controls
   remain functional; clicking a writable value in a row edits it inline in place
   and persists through the content-entry write path (read-only/unbound cells are
   not editable).
2. The Editor View canvas matches the Pages editor: one clean selection ring (no
   nested frames), panels attached to the floating toolbar, advanced controls in
   modals, focus-trapped command palette.
3. In the per-record entry view, clicking a bound on-canvas text edits **only**
   that field inline (no detached modal); read-only/unbound bindings are not
   editable; saving persists through the existing entry draft path.
4. No surface stacks more than one selection border per block; styling is
   coherent across List View, Editor View, per-record, and the Pages reference.
5. The neutral `authoring/*` primitives are shared by both editors; the
   authoring boundary test stays green; vitest, types, lint, and admin-boundary
   gates pass.
