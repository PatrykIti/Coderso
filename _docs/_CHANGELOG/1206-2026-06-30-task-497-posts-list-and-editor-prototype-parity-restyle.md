# 1206. TASK-497 Posts List & Editor Prototype-Parity Restyle

**Date:** 2026-06-30
**Version:** Unreleased
**Tasks:** TASK-497 (01 + 02 + 03); builds on the shipped TASK-479 soft/violet tokens + TASK-479-09 (Posts screen token migration)

> **PENDING RE-CONFIRMATION — TASK-497-02 was re-scoped after the owner rejected the first
> editor pass as "the old approach".** This entry has been rewritten to the **prototype-faithful**
> editor (in-page `PageHeader` above a framed `rounded-2xl … shadow-card` card; a Blocks-default
> three-tab left rail with Outline + List relocated to sibling tabs). TASK-497-03 is REOPENED
> until 497-02 re-lands; the **Validation** figures below describe the superseded first pass and
> MUST be re-run + re-recorded at reland (do not treat them as final).

## Summary

Second-pass prototype-parity **restyle** of the Posts **list** and the Posts **block
editor** — presentation + a small faithful layout extension, no re-architecture and no
feature change. Every post behavior (block model, autosave, revisions, runtime preview,
status, bulk actions, create drawer, keyboard shortcuts, every `data-post-editor-*` hook +
`aria-pressed`/`aria-controls`, and the inspector **Block** tab) is preserved exactly.
The editor is made **faithful to the prototype** (`PostEditorPreview.tsx` +
`EditorPreviewFrame.tsx`): an in-page shared `PageHeader` ABOVE a bordered
`rounded-2xl … shadow-card` **card** whose body is a **Blocks-default** three-tab left rail
(Outline + List relocated to sibling tabs). It keeps its **own** three-pane shell
(`PostEditorLayout`/`PostEditorRegions`) — it does **not** adopt the Pages
`shared/CanvasEditor.tsx` — and the list keeps `PageFilters` + `ListPaginationFooter` and
restyles `PostsTable` **in place** (no swap to `shared/DataTable.tsx`). The two invented
first-pass decisions are DROPPED: ~~D4~~ (full-viewport, no PageHeader/card) and ~~B6~~
(Outline as the default left pane). The classic editor (`PostClassicEditorShell`) is out of
scope (verified to still render on the redesign tokens only).

## Key Changes

### Posts list restyle (TASK-497-01)
- Header copy: description → "Write, schedule, and publish blog posts for your site.";
  primary button "New" → "New post" (still opens `PostsCreateDrawer`, not a bare Link).
- `PostsTable` restyled in place: container `shadow-card` → `shadow-soft`; quiet table
  header (dropped `bg-muted/40` + the per-cell `uppercase tracking-wider font-semibold`
  chrome); lean column set **Title / Status / Author / Published / Actions** (dropped
  the Categories/Tags + Updated columns; the fixture-only Comments column was never
  added); first-name author for display (Avatar initials still derive from the full
  name); whole-row click navigates to `/posts/{id}` reusing the existing `onEdit`, with
  `stopPropagation` on the checkbox + actions cells. Slug subtitle, selected-row tint,
  controlled bulk selection, `PageRowActions`, the bulk cluster, `PageFilters`, and
  `ListPaginationFooter` are all preserved.

### Post editor restyle — RE-SCOPED to prototype parity (TASK-497-02)
- New shared presentational primitive `core/admin/ui/shared/EditorRail.tsx`
  (`EditorRailGroup` / `EditorRailItem`, ported from the prototype
  `EditorPreviewFrame.tsx`). `EditorRailItem` is wireable (two discriminated
  button/div branches — no polymorphic-element type error) and supplies the shared
  `bg-primary-soft` active token. The shared `core/admin/ui/shared/PageHeader.tsx` is
  also consumed for the in-page header.
- **Ext#2 — in-page `PageHeader` + framed card:** `PostEditorLayout` is converted from the
  full-viewport `AdminShell contentClassName="overflow-hidden p-0"` shell to a normal padded,
  scrolling page rendering the shared `PageHeader` (breadcrumb + title + description "Write,
  format, and publish your story." + Preview/Save draft/Publish) ABOVE a bordered
  `rounded-2xl border bg-card shadow-card` card (`data-post-editor-frame`) with a tall
  `min-height`. Preview/Save draft/Publish move into `PageHeader.actions`.
- **Card chrome bar:** the card's top is a **single muted chrome strip** (`bg-muted/40`) with
  "Post editor" + autosave `Badge variant="outline"` (dynamic Saving… / Unsaved changes /
  Saved at HH:MM / Synced text kept) on the left; wired undo/redo (disabled when
  `canUndo`/`canRedo` are false) + optional device/viewport toggle + the six app toggles
  (Add-block / Outline / Details / Focus / Revisions / Settings, demoted to `icon` ghost
  buttons, Ext#3) on the right — keeping **every** `data-post-editor-*` / `aria-pressed` /
  `aria-expanded` / `aria-controls` / `aria-keyshortcuts` attribute. The
  `data-post-editor-header-row="secondary"` row is removed.
- **Ext#1 — Blocks-default three-tab left rail:** `PostEditorLeftRailMode` is extended to
  `"blocks" | "outline" | "list-view"`, defaulting to **`"blocks"`**. The two left components
  are unified into ONE always-open rail (`PostListViewSidebar`) with a segmented control
  **Blocks | Outline | List** (`data-post-editor-left-rail-tab`), all `forceMount`; the real
  `BlockInserter` palette is the DEFAULT **Blocks** tab, and Document **Outline** + **List view**
  are **relocated to sibling tabs** (not dropped). The "Insert block from outline" Plus dropdown
  (`data-post-editor-outline-insert`) is re-homed into the Outline tab. Left rail region surface
  → `bg-muted/20`; the palette's "Most used"/category sections are wrapped in `EditorRailGroup`
  and each option row carries the rail active token `bg-primary-soft` via `className` on its kept
  `<Button role="option">` (the listbox roving-keyboard a11y is preserved — no literal
  `EditorRailItem` in the listbox).
- Right inspector region → `bg-card`; `DocumentInspector` flattened from heavy
  `InspectorSection` cards to a flat "Post settings" + status header, light
  `InspectorRow` rows, and a **single** `bg-muted/30` SEO sub-card. The Post title row,
  every `onChange*` handler, the Danger zone, and the **Block** tab are all kept.
- Canvas: title nudged `text-5xl` → `text-3xl` for prototype parity; dotted background
  + `max-w-2xl` card frame unchanged, no fixture byline introduced.

### Tests, docs & closure (TASK-497-03)
- `tests/vitest/ui/posts-editor-chrome-wave.test.tsx` (REPLACE — its committed first-pass
  describe with the `leftRailMode:"outline"` mock is overwritten) renders the real
  `PostBlockEditorShell` and pins the re-scoped editor: in-page `PageHeader` (description +
  Preview/Publish in `PageHeader.actions`) ABOVE a framed `rounded-2xl … shadow-card` card
  (`data-post-editor-frame`); single muted chrome bar, dynamic autosave badge, wired/disabled
  undo-redo, device toggle; Blocks-default three-tab rail (`data-post-editor-left-rail-tab`
  blocks|outline|list-view, default blocks) with `EditorRailGroup` consumption + active rail
  token; flat "Post settings" inspector with single SEO sub-card + Block tab; guarded dotted
  canvas.
- Extended `posts-list.test.tsx` + `posts-table-wave.test.tsx` with the list restyle
  assertions; re-baselined the presentation-lock suites to the new look without
  weakening any functional assertion: `post-document-inspector-wave.test.tsx`,
  `page-post-list-wave.test.tsx` (Posts-side "New" → "New post" lookups only — Pages
  lookups left at `=== "New"`), the five `tests/vitest/ui-integration/post-*`
  suites (document-inspector, shell-restyle, header-workflow, layout-shell,
  writing-canvas-flow, plus the canvas-shared `text-5xl` → `text-3xl` re-baseline), and the
  re-scope additions `post-editor-layout-state.test.ts` (default `leftRailMode` "outline" →
  "blocks"), `post-block-editor-shell.test.tsx`, `post-editor-layout-hook-wave.test.tsx`,
  `post-list-view-sidebar-wave.test.tsx` (2→3 tabs), `post-editor-listview-outline.test.tsx`,
  and `post-editor-smoke-regression.test.tsx` (the `"Document Outline"` copy re-pointed to a
  stable rail marker).

## Validation

- `bun --cwd core lint` — PASS (`--max-warnings=0`).
- `bun --cwd core lint:types` — PASS.
- Full Posts vitest surface (`tests/vitest/posts`, `tests/vitest/ui/posts-*`,
  `tests/vitest/ui/post-*`, `page-post-list-wave`, `tests/vitest/ui-integration/post-*`)
  — 84 files / 398 tests PASS.
- Full `bun run test:vitest` — first-pass figure was 746 files / 4488 tests PASS. **Re-scope
  note:** `posts-editor-chrome-wave.test.tsx` already exists on-branch, so the re-scope adds
  **no** file (it is a REPLACE) — the file/case counts MUST be re-run + re-recorded at reland;
  the re-baselined presentation-lock strings move, not weaken.
- `bun run test:bun` — 1157/0 PASS (no posts unit regressed).
- DB-backed posts integration (`tests/integration/posts/{posts-revisions-flow,posts-runtime-flow}`,
  `bun:test`-owned, run explicitly with the `.env` preamble) — 3/0 PASS.
- `bun run gates:coderso` — 5/5 PASS (functional / ux / performance / security /
  reliability).
- Runtime smoke (`coderso-dev-core-host` + `playwright-cli`, real Posts list + editor) —
  8/8 PASS across light + dark.

## Process notes

- The ≥5-round **sequential** pre-implementation contract audit (converged in 6 rounds)
  caught two contract gaps before code was written and preserved here as drift-findings:
  (1) the restyle breaks the ~26 `tests/vitest/ui-integration/` **presentation-lock** suites
  the original contract had not enumerated (they render the real header/inspector/list and
  assert the first-pass chrome, so they would have red-gated closure) — resolved by explicitly
  re-baselining them (changed strings re-pointed, **no** functional assertion weakened); and
  (2) the `EditorRailItem` **polymorphic-element type trap** — `const Cmp = onClick ? "button"
  : "div"` narrows JSX props to the button∩div intersection and hard-fails `lint:types` — fixed
  with the discriminated `ElementType` / button-div branches.
- The `bun test` full-suite file count moved from the 745 baseline to **746** (+1 file) during
  the first pass, which added `posts-editor-chrome-wave.test.tsx`. The re-scope does **not** add
  another file (that suite is REPLACED, not re-created) — re-confirm the live file/case counts at
  reland.
- One `tests/vitest/ui/*` per-test timeout inherited from the TASK-496 dead-code Sweep-6 was
  bumped to absorb a load-related flake — non-weakening (no assertion changed).
- The implementation run was interrupted mid-way by a weekly rate limit and completed from the
  on-disk partial work (verify+complete → validate → post-audit → runtime smoke); the gate
  figures above are the post-completion results.

## Contract note

Pure restyle — **no** route / RBAC / cache / preview-token / `adminPaths` /
document-model change, and **no** contract doc (`PAGE_MODEL.md` / `PREVIEW_SPEC.md` /
`DESIGN_TOKENS.md`) required an edit. The soft/violet tokens already shipped with
TASK-479; the only new module is the presentational `core/admin/ui/shared/EditorRail.tsx`.
Cross-links: [[admin-ui-redesign-prototype]], [[pages-editor-v2-remediation-program]].
