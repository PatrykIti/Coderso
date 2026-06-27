# TASK-479-13-L03: Entries Tests
# FileName: TASK-479-13-L03-Entries-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-13-L01, TASK-479-13-L02
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-13
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add Vitest render tests that lock the restyled Entries list + editor structure and
prove the restyle preserved behavior: the list renders the type filter, status tabs
(counts derived from cached entries), the `rounded-2xl` DataTable with violet status
badges, and selection still surfaces the bulk cluster; the editor renders the
two-column content/sidebar layout with Title/Slug bound, schema-driven field cards,
and the Publish/Taxonomy/Metadata sidebar still wired.

- **Goal:** Guard L01 + L02 against regressions with focused, deterministic render
  tests in the Bun-free admin Vitest lane.
- **Owning module/service:**
  `tests/vitest/ui-integration/entry-list-restyle.test.tsx` (new) exercising
  `core/admin/ui/entries/EntryList.tsx` + children, and
  `tests/vitest/ui-integration/entry-editor-restyle.test.tsx` (new) exercising
  `core/admin/ui/entries/EntryEditor.tsx` + `EntryMetadataPanel.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`. Pattern reference: existing
  entries suites `tests/vitest/ui/entry-list-wave.test.tsx`,
  `tests/vitest/ui/entry-table-wave.test.tsx`,
  `tests/vitest/ui/entry-bulk-actions.test.tsx`,
  `tests/vitest/ui/content-entry-editor.test.tsx`,
  `tests/vitest/ui/entry-editor-shell-wave.test.tsx`,
  `tests/vitest/ui/entry-metadata.test.tsx` (copy their render harness, cache seeding,
  and `fetch` mocks — do NOT invent a new utility).
- **Out of scope:** No runtime/Bun coverage moves; no new product code (that is
  L01/L02); no API/contract tests beyond what the UI render already exercises.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests use mocked `fetch`/cache exactly as the
existing entries suites do; no real network, secrets, or RBAC bypass.

---

## Implementation Pseudocode

Reuse the established harness from the existing entries suites (the `renderAdminUi` /
`AdminRouterProvider` wrapper, the cache seeders for `getCachedAllEntries` /
`getCachedContentTypes` / `getEntryCached`, mocked `fetch`, and `flushEffects`). Do
NOT build a new render utility.

```tsx
// tests/vitest/ui-integration/entry-list-restyle.test.tsx
// @vitest-environment happy-dom
import { EntryList } from "../../../core/admin/ui/entries/EntryList";
// + cacheKeys, broadcastCacheEvent, renderAdminUi, seedEntriesCache(),
//   seedContentTypesCache(), entryListItem(), flushEffects — copy shapes from
//   tests/vitest/ui/entry-list-wave.test.tsx.

afterEach(() => { clearEntriesCache(); clearContentTypesCache(); vi.restoreAllMocks(); });

test("list renders the type filter with per-type counts from cache", async () => {
  seedContentTypesCache([ct({ slug: "article", name: "Article" }), ct({ slug: "event", name: "Event" })]);
  seedEntriesCache([
    entryListItem({ id: "e1", status: "published", contentType: { slug: "article", name: "Article" } }),
    entryListItem({ id: "e2", status: "draft",     contentType: { slug: "event",   name: "Event" } }),
  ]);
  const { getByRole } = await renderAdminUi(<EntryList />);
  await flushEffects();
  // type Select option text includes "Article (1)" / "Event (1)" (typeOptions counts)
});

test("status tab strip shows counts derived from cached entries and drives statusFilter", async () => {
  seedEntriesCache([
    entryListItem({ id: "e1", status: "published" }),
    entryListItem({ id: "e2", status: "draft" }),
    entryListItem({ id: "e3", status: "published" }),
  ]);
  // render + flush; assert "All 3", "Published 2", "Drafts 1" tabs;
  // click the "Drafts" tab -> only the draft row remains visible.
});

test("table wrapper carries the rounded-2xl card classes and renders StatusBadge labels", async () => {
  seedEntriesCache([entryListItem({ id: "e1", status: "scheduled", title: "Launch" })]);
  // render + flush; assert table container className contains "rounded-2xl";
  // assert the status cell renders the "Scheduled" label (shared StatusBadge).
});

test("selecting a row surfaces the bulk actions cluster", async () => {
  seedEntriesCache([entryListItem({ id: "e1" }), entryListItem({ id: "e2" })]);
  // render + flush; toggle a row checkbox -> EntryBulkActionsBar visible
  // (selectedCount text / Apply control), behavior untouched by restyle.
});
```

```tsx
// tests/vitest/ui-integration/entry-editor-restyle.test.tsx
// @vitest-environment happy-dom
import { EntryEditor } from "../../../core/admin/ui/entries/EntryEditor";
// seed window.location.pathname = "/entries/article/e1" (resolveEntryParams),
// seed getEntryCached(article,e1) + a content type whose schema has >=1 field;
// mock fetch for taxonomy/site-settings as the existing editor suite does.

test("editor renders the two-column content + Publish/Taxonomy/Metadata sidebar", async () => {
  // render + flush; assert content column has a rounded-2xl surface,
  // the right sidebar shows the Publish status Select + Save metadata/Delete,
  // and the header exposes Runtime preview / Save draft / Publish.
});

test("title/slug stay bound: typing flips the Unsaved changes badge", async () => {
  // render + flush; type into the Title textarea ->
  // queryByText(/unsaved changes/i) becomes truthy (setUnsavedChanges wiring intact).
});

test("schema-driven field cards still render via FieldRenderer", async () => {
  // seed a content type with a text field "summary"; render + flush;
  // assert the field Card with its Label renders and its input is editable
  // (handleFieldChange wiring intact).
});
```

**Data flow:** seed `cacheKeys.entriesAllList` / `cacheKeys.contentTypesList` (and
`cacheKeys.entryDetail(type,id)` for the editor) so the pages hydrate from cache (the
lazy `useMemo` initial-cache path) → mock `fetch` for the background refresh +
taxonomy + site settings → `flushEffects` → assert DOM. Keep each `test`
independent (clear caches + restore mocks in `afterEach`).

**Error handling (test concerns):** stub any `navigator`/timer dependency the
existing suites stub; assert the soft dashed empty-state renders when the cache +
list are empty (list) and the "Loading entry fields..." / "no fields yet" panels for
the editor; ensure no test depends on real timers or network.

**Regression-test shape:** list — type-filter counts, status-tab counts + filtering,
rounded-2xl table + StatusBadge labels, bulk cluster on selection; editor —
two-column layout + sidebar wiring, Title/Slug dirty-flag flip, schema field card
render. These lock the restyle without re-asserting client/service internals already
covered by the existing suites.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/entry-list-restyle.test.tsx tests/vitest/ui-integration/entry-editor-restyle.test.tsx`
- Regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-bulk-actions.test.tsx tests/vitest/ui/entry-list-filters.test.ts tests/vitest/ui/content-entry-editor.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/entry-metadata.test.tsx`
- State explicitly in the closeout if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-13-L03`.
- No contract-doc change expected (tests only); note the two new suite paths in the
  changelog entry.
