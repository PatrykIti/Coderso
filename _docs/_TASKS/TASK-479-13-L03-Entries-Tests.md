# TASK-479-13-L03: Entries Tests
# FileName: TASK-479-13-L03-Entries-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-13-L01, TASK-479-13-L02
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-13
**Started:** 2026-06-28
**Completed:** 2026-06-29

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

Reuse the established **interactive** harness from the existing entries suites — the
`createRoot` + `React.act` `mount()` / `flushAsync()` pattern in
`tests/vitest/ui/entry-list-wave.test.tsx` and
`tests/vitest/ui/entry-editor-shell-wave.test.tsx` — with the same `vi.mock` /
`cacheKeys` cache seeding, `globalThis.fetch` stub, and `window.history.replaceState`
path seeding (editor). This repo has **no** `@testing-library/react` / `jest-dom` /
`user-event`, so assert with plain DOM (`container.querySelectorAll`,
`container.textContent`, `.click()`, dispatched `input` events under `React.act`) —
NOT `getByRole` / `queryByText` / `fireEvent`. The SSR `renderAdminUi`
(`tests/utils/adminRouterRender.tsx`, `renderToString`) returns a one-shot HTML
**string** and is non-interactive — use it only for static markup snapshots (as
`tests/vitest/ui/content-entry-editor.test.tsx` does), never for click/typing flows or
post-interaction state. Do NOT build a new render utility.

```tsx
// tests/vitest/ui-integration/entry-list-restyle.test.tsx
// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { EntryList } from "../../../core/admin/ui/entries/EntryList";
// Copy the hoisted `vi.mock` cache state + `mount()` / `flushAsync()` helpers and the
// EntryFilters / PageHeader host-component mocks VERBATIM from
// tests/vitest/ui/entry-list-wave.test.tsx (it mocks the `EntryFilters` and `PageHeader`
// host components — it does NOT `vi.mock('@/components/ui/select')` the Radix Select
// primitive — so the type/status filter options render as plain queryable DOM instead
// of a portal-only Radix Select). Do NOT import a new utility. Statuses use the real
// EntryStatus enum (draft|published|scheduled|archived).

afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

test("list renders the type filter with per-type counts from cache", async () => {
  // seed the hoisted cache state with two types + one entry each (article/event)
  const view = mount(<EntryList />);
  await flushAsync();
  // via the mocked EntryFilters host (NOT a live portal-rendered Radix Select),
  // view.container.textContent includes the typeOptions counts, e.g. "Article (1)" /
  // "Event (1)" — keep the type filter inside the mocked EntryFilters host so the
  // per-type counts stay assertable as plain DOM.
  view.cleanup();
});

test("status tab strip shows counts derived from cached entries and drives statusFilter", async () => {
  // seed 3 entries: 2 published, 1 draft
  const view = mount(<EntryList />);
  await flushAsync();
  // tab count pills render inline (not in a portal): assert textContent contains
  // "All 3", "Published 2", "Drafts 1". Then click the "Drafts" StatusTabs button
  // (find via container.querySelectorAll + textContent) inside React.act and assert
  // only the draft row remains in view.container.textContent.
  view.cleanup();
});

test("table wrapper carries the rounded-2xl card classes and renders StatusBadge labels", async () => {
  // seed one scheduled entry titled "Launch"
  const view = mount(<EntryList />);
  await flushAsync();
  // assert view.container.querySelector('[data-slot="data-table"]')?.className (or the
  // table wrapper) contains "rounded-2xl"; assert the status cell textContent contains
  // "Scheduled" (shared StatusBadge label).
  view.cleanup();
});

test("selecting a row surfaces the bulk actions cluster", async () => {
  // seed two entries
  const view = mount(<EntryList />);
  await flushAsync();
  // React.act(() => container.querySelector("input[type='checkbox']")?.click());
  // assert EntryBulkActionsBar visible (selectedCount text / Apply control) — behavior
  // untouched by restyle (mirror entry-list-wave's bulk-action interaction).
  view.cleanup();
});
```

```tsx
// tests/vitest/ui-integration/entry-editor-restyle.test.tsx
// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
// Seed the path BEFORE importing EntryEditor (resolveEntryParams reads
// window.location.pathname for the "entries" segment), exactly like
// tests/vitest/ui/entry-editor-shell-wave.test.tsx:
//   window.history.replaceState({}, "", "/admin/entries/articles/e1");
//   const { EntryEditor } = await import("../../../core/admin/ui/entries/EntryEditor");
// Seed getEntryCached(articles,e1) + a content type whose schema has >=1 field via the
// same hoisted vi.mock cache state; stub globalThis.fetch for taxonomy/site-settings
// as the existing editor suite does; mount() + flushAsync() (createRoot + React.act).

test("editor renders the two-column content + Publish/Taxonomy/Metadata sidebar", async () => {
  // mount + flushAsync; assert the content column carries a "rounded-2xl" surface,
  // view.container.textContent shows the Publish status Select + Save metadata/Delete,
  // and the header exposes "Runtime preview" / "Save draft" / "Publish".
});

test("title/slug stay bound: typing flips the Unsaved changes badge", async () => {
  // mount + flushAsync; set the Title textarea value + dispatch an "input" event under
  // React.act -> view.container.textContent now contains "Unsaved changes"
  // (setUnsavedChanges wiring intact). No queryByText/user-event.
});

test("schema-driven field cards still render via FieldRenderer", async () => {
  // seed a content type with a text field "summary"; mount + flushAsync;
  // assert the field Card with its Label renders (container.textContent) and its input
  // is editable (handleFieldChange wiring intact).
});
```

**Data flow:** seed `cacheKeys.entriesAllList` / `cacheKeys.contentTypesList` (and
`cacheKeys.entryDetail(type,id)` for the editor) so the pages hydrate from cache (the
lazy `useMemo` initial-cache path) → mock `fetch` for the background refresh +
taxonomy + site settings → `flushAsync()` (await `React.act`) → assert DOM. Keep each
`test` independent (reset the hoisted cache state, `document.body.innerHTML = ""`, and
restore mocks in `afterEach`).

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
