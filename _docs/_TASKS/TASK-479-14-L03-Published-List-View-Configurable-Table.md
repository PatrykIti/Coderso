# TASK-479-14-L03: Published List View + Configurable Table/View
# FileName: TASK-479-14-L03-Published-List-View-Configurable-Table.md

**Priority:** Medium
**Category:** Admin UI / Custom Screens / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-06, TASK-479-14-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-14
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the **published screen List View** — the runtime workspace shown when an
author opens a published screen from the sidebar — to the prototype look: a
"Published / In sidebar" banner, a stat row, view-type tabs, a soft
`rounded-2xl` data table of entries, and a dockable **"Customize view"** panel
(toggle / reorder / rename columns, view type, group / sort / density, page size)
whose configuration is saved **per screen**. The table is flexibly configurable;
the panel is the user-facing surface for that configuration.

- **Goal:** `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` (+
  `CustomScreenEntriesTable.tsx`, `CustomScreenEntriesFilters.tsx`,
  `ListViewColumnInspector.tsx`) reads like
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEntriesPage.tsx` — published
  banner + stats + view-type tabs + restyled DataTable + a `Customize view`
  side panel (`ViewConfigPanel`) — while preserving the real entry bindings,
  inline row edits, capability gating, pagination, cache subscription, and the
  per-screen persistence of the view config through the EXISTING definition write
  path.
- **Owning module/service:**
  `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`,
  `CustomScreenEntriesTable.tsx`, `CustomScreenEntriesFilters.tsx`,
  `ListViewColumnInspector.tsx`; data via `customScreensClient.ts`, the entries
  read path (`cacheKeys.entriesList(slug)`), `resolveCustomScreenCapabilities`,
  and `CustomScreenListColumn` from `customScreenSchemas.ts`.
- **Source-of-truth docs:** prototype published list
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEntriesPage.tsx` (esp.
  `ViewConfigPanel`) + `_docs/_PROTOTYPE/src/lib/screensMock.ts`; prototype
  patterns `_docs/_PROTOTYPE/src/components/patterns/{DataTable,FilterBar,Pagination,StatusBadge,PageHeader}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`;
  [[task-468-completion-state]] (List View canvas) /
  [[task-474-custom-screen-canvas-parity]].
- **Out of scope:** No new persistence endpoint, cache key, or definition field.
  Column visibility/order/rename/group/sort/density persist ONLY through the
  EXISTING custom-screen list-view config the editor's `ListViewDesigner` already
  writes (`customScreensClient` definition update) — if a particular knob has no
  existing definition field, keep it as session/local view state and flag it as a
  follow-up rather than inventing a payload field (schema-first). No change to
  entry CRUD, inline-edit normalization (`normalizeInlineRowValue`), or the
  capability gate. The non-table view types (Board/Gallery/Calendar) are
  presentation tabs only here — wiring a brand-new Board/Gallery renderer is NOT
  in scope unless one already exists; restyle the tab control and keep the Table
  view as the functional default.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

`CustomScreenEntriesPage` resolves the screen via `resolveCustomScreenId`, gates
on `resolveCustomScreenCapabilities`, reads entries through the cached entries
path, renders `CustomScreenEntriesTable` (with inline row edit via
`normalizeInlineRowValue`), and subscribes to `cacheKeys.customScreensList` /
`cacheKeys.customScreenDetail(id)` / `cacheKeys.entriesList(slug)`. Keep all of
that; restyle the header, banner, stats, tabs, table, and add the config panel.

```tsx
// 1) Header — port the prototype PageHeader: screen icon + name, description
//    "Published screen · {description}", actions = "Edit screen" (ghost, AdminLink
//    to the editor), "Customize view" (toggles the config panel; variant soft when
//    open), primary "New {singular}". All keep REAL handlers/hrefs (AdminLink +
//    adminPaths/route helpers) — no hand-built paths.

// 2) Published banner + stats:
//    <Badge variant="success"><dot/> Published</Badge> + "In sidebar · {contentType} entries"
//    then a stat grid (Total/Active/…); stat values come from the REAL screen
//    summary, NOT the prototype mock.

// 3) View-type tabs (Table/Board/Gallery/Calendar) — restyle the rounded
//    segmented control; Table stays the functional view. activeView is local UI
//    state; switching to a non-implemented view shows the existing/placeholder
//    surface, it does NOT break the table.

// 4) Table — restyle CustomScreenEntriesTable to the prototype DataTable look
//    (rounded-2xl wrapper, soft header, per-type cell renderers: title link,
//    StatusBadge, person Avatar, badge, money tabular, Progress, date, tags). The
//    title cell links to the entry editor via AdminLink + buildCustomScreenWorkspacePath.
//    Inline row edit (normalizeInlineRowValue) and selection/bulk
//    (CustomScreenEntriesBulkActionsBar) stay wired; restyle only.

// 5) Customize-view panel — port ViewConfigPanel as a docked Card (or the existing
//    ListViewColumnInspector restyled) shown when showConfig is true:
//      grid -> lg:grid-cols-[1fr_320px] when open.
//      Columns list: GripVertical (reorder) + Checkbox (visibility, Lock for locked)
//        + label (rename) + type Badge — each row bound to the REAL CustomScreenListColumn.
//      Group by / Sort by / Row height / Page size Selects.
//      Footer: "Saved to this screen" + Save view button.
//    Persistence: "Save view" writes the column config (visibility/order/labels +
//    any supported group/sort/density) through the EXISTING customScreensClient
//    definition update (same V4 list-view config ListViewDesigner writes). Knobs
//    with no existing definition field stay local session state + a // TODO(follow-up)
//    note — do NOT add a payload field.

// 6) Config panel open/close: keep a single `showConfig` boolean (lazy init), like
//    the prototype useState — do NOT add an effect to sync it. Column working-set
//    derives from the definition via useMemo; "Save view" commits it.
```

**Data flow:** route params → screen definition (cached) + entries (cached) →
`tableColumns` derived (`useMemo`) from the definition's visible columns → restyled
`DataTable`/`CustomScreenEntriesTable` renders rows with per-type cells + inline
edit → `Customize view` panel mutates a working column config → "Save view" writes
through `customScreensClient` (V4 definition) and invalidates
`cacheKeys.customScreenDetail(id)`. The restyle touches only JSX/classNames +
re-skins the existing column inspector.

**Cache (preserve):** Keep the `subscribeCacheEvents` guards
(`customScreensList`, `customScreenDetail(screenId)`, `entriesList(contentTypeSlug)`)
and the existing refresh flow. No mount-force refetch; no overwrite of an
in-progress inline edit (respect the existing dirty/pending guards).

**Per-screen persistence (preserve schema-first):** The saved view config reuses
the EXISTING list-view definition write — no new endpoint/field. This keeps the
Security Contract (no API change) true. If the prototype shows a knob the
definition cannot store, it is local-only + flagged, never a silent schema change.

**Navigation constraint (preserve):** "Edit screen", the entry title links, and
"New {singular}" route through `AdminLink`/`adminPaths`/`buildCustomScreenWorkspacePath`.
Do not hand-build hrefs.

**React-hooks rules:** `showConfig`, `activeView`, and the column working-set use
lazy init / render-time derivation; no sync `setState` in effects.

**Error handling:** Keep the existing capability-denied banner
("not yet ready for the dedicated editor workflow…"), load-error `<Alert>`, and
empty ("No records match your current view.") states; they inherit the new
styling. No new error surfaces.

**Regression-test shape:** see L05 — render `CustomScreenEntriesPage` for a
published screen with seeded entries; assert the Published banner + stats render,
the table wrapper carries `rounded-2xl`, "Customize view" toggles the config panel,
toggling a column Checkbox hides/shows that table column, the title cell links via
the canonical workspace href, and an inline row edit still calls the real update
path.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx`
  (new suite in L05)
- Existing records/list-view suites MUST stay green:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screen-record-interactions.test.tsx tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/ui/custom-screen-list-view.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-14-L03`.
- Document the "Customize view" panel + its per-screen persistence path (and any
  local-only knobs flagged for follow-up) in the Custom Screens UX note; cross-link
  [[task-468-completion-state]] / [[task-474-custom-screen-canvas-parity]].
