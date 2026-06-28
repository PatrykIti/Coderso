# TASK-479-14-L03: Published List View + Configurable Table/View
# FileName: TASK-479-14-L03-Published-List-View-Configurable-Table.md

**Priority:** Medium
**Category:** Admin UI / Custom Screens / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06, TASK-479-14-L01
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
that adjusts the **current (local/session) view**. The table is flexibly
configurable; the panel is the user-facing surface for that configuration.
Durable per-screen column configuration is authored in the **editor's List-view
designer** (`ListViewDesigner`, L02), which already owns the definition write —
this runtime page does NOT introduce a new definition-write surface.

- **Goal:** `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` (+
  `CustomScreenEntriesTable.tsx`, `CustomScreenEntriesFilters.tsx`,
  `ListViewColumnInspector.tsx`) reads like
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEntriesPage.tsx` — published
  banner + stats + view-type tabs + restyled DataTable + a `Customize view`
  side panel (`ViewConfigPanel`) — while preserving the real entry bindings,
  inline row edits, capability gating, pagination, and cache subscription. The
  `Customize view` panel is **local/session view state** on this runtime page; it
  does NOT write the screen definition (durable per-screen column config stays
  owned by the editor's `ListViewDesigner`, L02).
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
- **Out of scope:** No new persistence endpoint, cache key, definition field, or
  **definition write from this runtime page**. The published `CustomScreenEntriesPage`
  today only READS the definition and writes ENTRIES (inline edit via `updateEntry`);
  it does NOT import the `customScreensClient` definition-update path, and this
  restyle MUST NOT add one (a definition write here would be net-new scope and would
  require the editor capability a runtime viewer may lack). So the `Customize view`
  panel (column visibility/order/rename, group/sort/density, view type, page size)
  is **local/session view state** only. Durable per-screen column configuration
  remains authored in the editor's `ListViewDesigner` (the List-view designer tab,
  L02), which already owns the V4 list-view definition write. No change to entry
  CRUD, inline-edit normalization (`normalizeInlineRowValue`), or the capability
  gate. The non-table view types (Board/Gallery/Calendar) are
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
//    The "Published / In sidebar" label reflects the REAL state
//    (resolveCustomScreenSidebarShortcutState(screen) === "visible", i.e.
//    status === "active" && showInSidebar) — NOT a fabricated `published` field.
//    Then a stat grid (Total/Active/…); stat values derive from the REAL loaded
//    data (e.g. Total = entries.length, Active = entries filtered by status),
//    NOT a prototype mock or a non-existent screen-summary object. If a stat has
//    no real backing, drop it (de-fabricate) rather than wiring fake numbers.

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
//      Footer: "Applied to this view" + an Apply/Reset button (NOT a screen-wide
//        "Save view"/definition write — see Persistence below).
//    Persistence: this runtime page does NOT write the screen definition. The panel
//    mutates LOCAL/session view state only (column visibility/order/labels, group/
//    sort/density, view type, page size); it never calls customScreensClient. To
//    change the DURABLE per-screen default, the author edits the List-view designer
//    in the editor (L02), which owns the existing V4 list-view definition write.
//    Optionally surface a "Edit in builder" AdminLink to that editor tab.

// 6) Config panel open/close: keep a single `showConfig` boolean (lazy init), like
//    the prototype useState — do NOT add an effect to sync it. The column
//    working-set seeds from the definition's visible columns via useMemo;
//    the panel commits to LOCAL view state (no definition write).
```

**Data flow:** route params → screen definition (cached) + entries (cached) →
`tableColumns` derived (`useMemo`) from the definition's visible columns → restyled
`DataTable`/`CustomScreenEntriesTable` renders rows with per-type cells + inline
edit → `Customize view` panel mutates a LOCAL/session working column config that
re-renders the table → no `customScreensClient` definition write fires from this
page (the entries page keeps only its existing entry writes). The restyle touches
only JSX/classNames + re-skins the existing column inspector.

**Cache (preserve):** Keep the `subscribeCacheEvents` guards
(`customScreensList`, `customScreenDetail(screenId)`, `entriesList(contentTypeSlug)`)
and the existing refresh flow. No mount-force refetch; no overwrite of an
in-progress inline edit (respect the existing dirty/pending guards).

**Per-screen persistence (preserve schema-first + RBAC):** The `Customize view`
panel is local/session only — it adds NO definition write to this runtime page, so
the Security Contract (no API/permission change) stays literally true and a runtime
viewer never needs the editor capability. Durable per-screen column configuration
lives in the editor's `ListViewDesigner` (L02), which already owns the V4 list-view
definition write; this page may link to it but never writes it.

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
- Existing records/list-view suites MUST stay green (paths verified on disk —
  `record-interactions` lives under `ui-integration`):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/ui/custom-screen-list-view.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-14-L03`.
- Document that the runtime "Customize view" panel is **local/session view state**
  (no definition write from this page) and that durable per-screen column config is
  authored in the editor's `ListViewDesigner` (L02), in the Custom Screens UX note;
  cross-link [[task-468-completion-state]] /
  [[task-474-custom-screen-canvas-parity]].
