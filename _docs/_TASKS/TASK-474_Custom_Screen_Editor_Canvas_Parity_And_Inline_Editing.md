# TASK-474: Custom Screen Editor Canvas Parity And Inline Editing
# FileName: TASK-474_Custom_Screen_Editor_Canvas_Parity_And_Inline_Editing.md

**Priority:** High
**Category:** Admin UI / Custom Screens / Authoring UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-468-04 (Done), TASK-468-05 (Done); coordinates with TASK-473 (per-record presentation-override storage) for TASK-474-03 / TASK-474-06
**Status:** ✅ Done
**Completed:** 2026-06-24
**Changelog:** `_docs/_CHANGELOG/1193-2026-06-24-task-474-custom-screen-authoring-parity.md`

---

## Overview

TASK-468-04 and TASK-468-05 closed the Custom Screens V4 cutover, but they
**deliberately deferred** the authoring UX the owner expects:

- TASK-468-04 closed with *"List View configuration remains unchanged and
  table-only."*
- TASK-468-05 closed with *"the records list remains the existing table/list
  workflow"* and punted per-record text-size/image/style persistence to
  TASK-473.

The result is three Custom Screen surfaces that diverge from the **Pages editor**
(the agreed reference for "interactive canvas + floating panel"). This umbrella
owns the UX completion (owner request, 2026-06-21):

1. **List View editor** must work like the Pages editor — interactive canvas with
   a single floating bottom toolbar scoped to list-view options; the left
   ("List elements") and right (Screen / Selected Column) rails disappear. Records
   still present as a table, **and** clicking a value in a row edits it inline
   (owner decision 2026-06-21).
2. **Editor View** stays an interactive canvas + floating panel but becomes more
   advanced — existing advanced style controls open in **modals**, and the canvas
   styling/behavior matches the Pages editor.
3. **Per-record target view** stops over-bordering every block and lets the user
   **click a text on the canvas and edit only that bound field inline** — not a
   detached "Value" modal/panel.

### Root architectural cause

Two compounding causes, both verified in code:

1. **Parallel reimplementation under a hard import boundary.** The Custom Screen
   authoring stack (`ScreenAuthoringCanvas.tsx`, `ScreenRuntimeRenderer.tsx`,
   `CustomScreenEntryCanvas.tsx`) was built as a **separate** renderer from the
   Pages editor (`core/admin/ui/pages/editor/PageAuthoringCanvas.tsx`,
   `core/services/pages/pageInlineEditContract.ts`). The boundary test
   `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` forbids
   custom-screens from importing `@/ui/pages`, and forbids the neutral
   `core/admin/ui/authoring/*` package from importing `/pages`, `services`,
   `customScreens`, widgets, db, server, or Bun. So the reusable Pages
   capabilities (inline canvas text editing, a single selection ring, an attached
   expandable toolbar subpanel, the `controlChrome` tokens) **cannot be imported
   directly**; the screen renderer re-derived weaker versions (read-only
   `record-header <h2>` at `ScreenRuntimeRenderer.tsx:208`; an inline field path
   gated behind `enableInlineFieldEditing`, which `CustomScreenEntryCanvas.tsx:36`
   never passes). The neutral `authoring/*` package exists but lacks an inline-edit
   primitive and a selection token, so each editor owns its own — **TASK-474-01
   extracts the shared primitives** as the mandatory foundation.
2. **Explicit 468 scope cuts** left the List View as a 3-pane `EditorShell`
   builder and routed entry editing through a detached "Value" panel.

The "everything is bordered" symptom is one consequence: the borders stack four
deep — `AuthoringCanvasFrame.tsx:20` → `<section>` (`ScreenRuntimeRenderer.tsx:365`)
→ block wrapper (`:144-145`) → inner content card (`:202/234/304/318/326`) — versus
the Pages editor's single outline ring.

### Live evidence (playwright-cli, 2026-06-21)

Verified on screen **House Projects** (`a66a7d0f-8341-4600-8f44-ff740f66a1ba`),
entry **Dom Aurora 148** (`c8f0e3fa-5c2e-496d-9395-3c8d7292ca25`); screenshots in
`.tmp/task468-audit/`:

| View | Route | Observed |
|---|---|---|
| List View editor | `/advanced/custom-screens/:id` | 3-pane: left "List elements" library, center table, right inspector (Screen / Selected Column). |
| Editor View | same, Editor View tab | Canvas + dark floating pill toolbar; nested borders; panels open as a detached top-right box. |
| Per-record | `/entries/:entryId` | 3 nested rounded borders for one block; selecting it opens a detached "Value" panel; no inline edit. |
| Pages editor (reference) | `/pages/:id` | Full-width canvas, no rails; floating toolbar with an **attached** expandable panel; single selection ring; inline H1 editing. |

### Scope boundary vs TASK-473

TASK-473 owns the **storage/API contract** for per-record presentation overrides
(image/text-size/style outside `content_entries.data`). TASK-474 owns **UX**:
de-bordering, inline field-value editing through the existing entry path, the
List View canvas + inline row editing, and Editor View page-parity. Where
per-record *presentation* persistence is needed, TASK-474 depends on TASK-473.

## Sub-Tasks

| ID | Title | Effort | Depends on |
|----|-------|--------|------------|
| TASK-474-01 | Neutral Authoring Primitives Extraction | Large | — |
| TASK-474-02 | Collapse Nested Borders To Single Selection Ring | Medium | 474-01 |
| TASK-474-03 | Per-Record Inline Click-To-Edit | Large | 474-01, 474-02 |
| TASK-474-04 | List View Canvas And Floating Bar | Large | 474-01 |
| TASK-474-05 | Editor View Page Parity And Modal Controls | Large | 474-01, 474-02 |
| TASK-474-06 | List Row Inline Value Editing | Large | 474-01, 474-04; coordinates TASK-473 |

Implement in dependency order: 474-01 first (foundation), then 02/04 in parallel,
then 03/05/06.

> **Decomposition note:** each `TASK-474-NN` is a single cohesive change and is
> authored as an **execution-ready terminal unit** (it carries its own
> implementation pseudocode and Security Contract), rather than decomposing into
> `LNN` leaves. This is an intentional KISS choice for right-sized subtasks; if a
> subtask grows during implementation (e.g. 474-04 spans rails removal + canvas +
> dead-code delete), split it into `TASK-474-NN-LNN` leaves at that point.

## Cross-Cutting Changes

- Converge both editors onto ONE shared inline-edit primitive (`InlineEditWrapper`
  in `core/admin/ui/authoring`); the boundary test forbids importing the Pages
  copy, so the neutral package is the only legal shared home.
- One `selectionBorder` token replacing the hand-rolled `ring-2 ring-primary/35`
  in `ScreenRuntimeRenderer.tsx:146/367`.
- One de-bordered `AuthoringCanvasFrame` contract (borderless opt-out) so the
  renderer stops stacking section/block/content borders.
- One attached expandable toolbar subpanel shared by both editors (replacing the
  detached top-right `floatingPanel` box).
- A neutral `canvasChrome` token module mirroring the boundary-forbidden
  `controlChrome.ts`.
- `EditorViewDesigner.tsx` is dead code (self-referenced only) — deleted by
  TASK-474-04.

## Security Contract (umbrella)

Per-subtask Security Contracts live in the child files. Summary: no new public
endpoints. TASK-474-01/02/04/05 are UI-only (no network surface); inline content
edits (474-03) and list-row edits (474-06) persist through the existing internal
admin content-entry routes (`content:read`/`content:write`, CSRF, admin buckets,
route schemas rejecting unknown top-level keys, and content-service validation
against the content type schema). Inline editing must respect binding `mode`
(read bindings expose no editable affordance — fail-closed). TASK-474-06 keeps
additive, backward-compatible custom-screen definition schema with
`rejectUnknownKeys`. Per-record *presentation* persistence is owned by TASK-473.

## Risks

- **Boundary regression:** importing `@/ui/pages` from custom-screens (or pulling
  `services`/`Bun` into `authoring/*`) breaks the boundary test; the
  neutral-extraction approach (474-01) is mandatory.
- **Shared-renderer blast radius:** `ScreenRuntimeRenderer` serves
  builder/preview/entry **and** `CustomScreenPreview` + the workspace preview
  dialog; de-border/inline changes must be mode-gated.
- **Inline edit must fail-closed:** read/unbound bindings must render no
  `contentEditable`.
- **Rail removal (474-04)** must not lose the content-type/status/sidebar controls
  (relocate) or mobile/responsive coverage.
- **474-06 schema** is guarded by `rejectUnknownKeys` + V1/V2/V3 migration; a
  mis-specified field throws `custom_screen_definition_invalid` on existing rows —
  additive + backward-compatible only.
- **Old 3-pane definitions** must keep loading (read-repair preserved).

## Resolved Decisions (owner)

1. ~~**List View scope**~~ — **RESOLVED 2026-06-21:** chrome parity **plus** inline
   editing of real record values in the records workspace → TASK-474-06 is in
   scope. Builder List View remains configuration + preview only.
2. **Screen metadata home** once the right rail is gone — **RESOLVED 2026-06-21:**
   move metadata into a settings panel/modal opened from the floating bar.
3. ~~**Editor View modals**~~ — **RESOLVED 2026-06-21:** only the advanced
   style groups that exist in `ScreenBlockInspector` become modals; simple
   controls stay inline. Adding new typography controls requires schema,
   normalizer, persistence, and tests in that task or a follow-up.
4. **Detached Value panel** — **RESOLVED 2026-06-21:** remove it entirely in
   TASK-474-03. Read-only/unbound bindings fail closed inline and do not open a
   detached inspector.
5. **TASK-473 timing** — **RESOLVED 2026-06-21:** 474-03 persists only content
   field values through the existing entry path. Per-record presentation
   persistence lands through TASK-473 before presentation controls are wired.

## Testing Requirements (umbrella)

Each child runs its own lane. Family-level gates after each subtask:
`bun --cwd core lint`, `bun --cwd core lint:types`, the relevant
`tests/vitest/ui*` suites, `bun run check:admin-boundary`,
`bun --cwd core build:admin`, `bun run check:admin-bundle`, `git diff --check`,
plus live `playwright-cli` verification on screen `House Projects` / entry
`Dom Aurora 148` and a cross-check against `/pages/:id`.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`, `_docs/CMS_SPEC.md` (authoring UX), `_docs/CMS_API.md`
  (474-06 schema), `_docs/DATA_MODEL.md` (474-06 if stored shape documented),
  `_docs/ADMIN_CACHE*.md` (if cached resources change), `_docs/_TASKS/README.md`,
  `_docs/_CHANGELOG/` on closure.

## Acceptance Criteria

1. The List View editor is an interactive canvas with one floating bottom toolbar
   and **no** rails; records present as a table; column controls remain functional;
   clicking a writable value in a row edits it inline (read-only/unbound cells are
   not editable).
2. The Editor View canvas matches the Pages editor: one clean selection ring,
   panels attached to the floating toolbar, advanced controls in modals,
   focus-trapped command palette.
3. In the per-record view, clicking a bound on-canvas text edits **only** that
   field inline (no detached modal); read-only/unbound bindings are not editable;
   saving persists through the existing entry path.
4. No surface stacks more than one selection border per block; styling is coherent
   across List View, Editor View, per-record, and the Pages reference.
5. The neutral `authoring/*` primitives are shared by both editors; the authoring
   boundary test stays green; vitest, types, lint, and admin-boundary gates pass.
6. All TASK-474-NN children are `✅ Done`/`⏭️ Superseded`/`❌ Cancelled` before the
   parent closes.

## Completion Notes

- Completed TASK-474-01..06 in one implementation pass: shared neutral
  authoring primitives, single-ring Custom Screen chrome, inline record detail
  editing, rail-free List View builder, Editor View toolbar/modal parity, and
  additive V4 list-row `rowTemplate` inline editing.
- No new public endpoints were added. Inline record and row edits reuse the
  existing internal entry update path and fail closed for read-only/unbound
  bindings.
- TASK-473-03 is unblocked as the follow-up for presentation override panel and
  cache wiring.
