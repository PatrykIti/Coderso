# TASK-479-12-L05: Engine Tests
# FileName: TASK-479-12-L05-Engine-Tests.md

**Priority:** Medium
**Category:** Admin UI / Engine / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-12-L01, TASK-479-12-L02, TASK-479-12-L03, TASK-479-12-L04
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-12

---

## Overview

Add per-screen Vitest render suites that lock in the restyled Engine surfaces and
prove the restyle preserved real data/logic, canonical routing, and dirty-state
markers. Five surfaces: content type list, content type editor, schema builder,
collection workspace, detail-template editor.

- **Goal:** Guard the L01–L04 restyle with Vitest SSR render tests (Bun-free admin
  lane) that assert the new prototype-derived structure AND that behavioral
  affordances (selection/bulk, save/publish, schema fields, tabs, detail-template
  flow) survived; keep the existing engine suites green.
- **Owning module/service:** `tests/vitest/ui-integration/engine-*.test.tsx`
  (new) + the existing `tests/vitest/ui/*` engine suites.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`,
  `_docs/CONTENT_TYPES_SPEC.md`; the prototype screens under
  `_docs/_PROTOTYPE/src/pages/advanced/`.
- **Out of scope:** No runtime/Bun coverage moves; no new product behavior. Tests
  only — assert structure + preserved behavior.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Use the existing SSR harness `renderAdminUi` from
`tests/utils/adminRouterRender.tsx` (it wraps in `AdminRouterProvider` and returns
`renderToString(...)`; pass `{ path }` to seed a content-type id in the URL where
the screen reads it via `resolveContentTypeIdFromPath`). Match the style of the
current `tests/vitest/ui/content-type-editor.test.tsx`.

```tsx
// tests/vitest/ui-integration/engine-content-type-list-restyle.test.tsx
import { renderAdminUi } from "../../utils/adminRouterRender";
import { ContentTypeList } from "../../../core/admin/ui/content-types/ContentTypeList";

// (a) SSR chrome only — with an empty cache the list renders NO rows, so assert
//     just the always-visible band/header/empty-state (renderAdminUi is SSR-only).
test("content type list shows summary band chrome", () => {
  const html = renderAdminUi(<ContentTypeList />, { path: "/admin/content-types" });
  expect(html).toContain("Content Types");
  expect(html).toMatch(/Types/);    // StatCard band labels
  expect(html).toMatch(/Entries/);
  expect(html).toMatch(/Fields/);
});

// (b) Card grid needs SEEDED data → use the repo idiom (NOT renderAdminUi):
//     `// @vitest-environment happy-dom` + createRoot + a vi.mock of
//     contentTypesClient, mirroring tests/vitest/ui/content-type-list-parity.test.tsx.
//     Then assert per-card actions + that links resolve via AdminLink to the
//     admin-prefixed canonical route (resolveAdminRoutePath aliases
//     /content-types/* → /advanced/engine/*):
//       expect(container.textContent).toContain("Edit schema");
//       expect(container.querySelector('a[href^="/admin/advanced/engine/"]')).not.toBeNull();

// tests/vitest/ui-integration/engine-content-type-editor-restyle.test.tsx
test("content type editor renders tabs + fields section + sticky actions", () => {
  const html = renderAdminUi(<ContentTypeEditor />, { path: "/admin/content-types/sample" });
  for (const label of ["Fields", "Relations", "Settings"]) expect(html).toContain(label); // 3 triggers (no Permissions)
  expect(html).toContain("Add field");      // active Fields tab (editor seeds defaultFields)
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Collection workspace");
  // Do NOT assert Settings/Relations tab BODIES here — they are inactive under SSR.
});

// tests/vitest/ui-integration/engine-schema-builder-restyle.test.tsx
test("schema builder renders rail palette + inspector chrome", () => {
  const html = renderAdminUi(<SchemaBuilderPage />, { path: "/admin/content-types/sample/schema" });
  expect(html).toContain("Field types");                 // palette SectionCard
  for (const t of ["Text", "Number", "Boolean", "Rich text", "Media", "Relation", "Select"]) expect(html).toContain(t);
  expect(html).toMatch(/fields/);                         // field-count badge
  // Per-field canvas nodes need seeded fields → cover in a seeded createRoot test.
});

// tests/vitest/ui-integration/engine-collection-workspace-restyle.test.tsx
test("collection workspace renders the three tabs + refresh", () => {
  const html = renderAdminUi(<CollectionWorkspacePage />, { path: "/admin/advanced/engine/sample/collection" });
  for (const label of ["Entries", "Detail template", "Settings"]) expect(html).toContain(label); // tab triggers
  expect(html).toContain("Refresh");
  // CollectionOverview (needs summary) + CollectionReadinessChecklist (Settings tab) → seeded test.
});

// tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx
test("detail template editor renders restyled editor chrome", () => {
  const html = renderAdminUi(<DetailTemplateEditorPage />, { path: "/admin/advanced/engine/sample/collection/detail-template/1" });
  expect(html).toContain("Save");      // editor actions present
  // assert a LibraryPanel/BlockList region marker and the binding panel still render
});
```

**Data flow:** two lanes. (1) Chrome-only assertions are pure SSR string checks
over the first render via `renderAdminUi` (SSR-only) with an empty cache — these
must NOT depend on network. (2) Anything that needs seeded data to render (list
cards, schema-builder canvas nodes, collection-workspace overview/readiness,
inactive-tab bodies) uses the repo's real idiom — `// @vitest-environment
happy-dom` + `createRoot`/`React.act` + a `vi.mock`/`vi.hoisted` of the relevant
client module (`contentTypesClient` / `detailPagesClient` / `siteSettingsClient`),
exactly as `tests/vitest/ui/content-type-list-parity.test.tsx`,
`schema-builder.test.tsx`, and `collection-workspace.test.tsx` already do. There
is **no** public `getCachedContentTypes` seeding helper and there is no RTL /
jest-dom / user-event in this repo — do not introduce them.

**Error handling (test design):** assert presence of the preserved Alert/dirty
markers where feasible (e.g. the editor's unsaved-changes copy, the workspace's
remote-update-pending affordance) so the restyle can't silently drop them. Keep
assertions resilient (`toContain`/`toMatch` on labels), not brittle full-DOM
snapshots.

**Regression guard:** also re-run and, where the restyle intentionally changed
literal class strings, update — never delete behavioral assertions in:
`tests/vitest/ui/content-type-editor.test.tsx`,
`tests/vitest/ui/schema-builder.test.tsx`,
`tests/vitest/ui/collection-workspace.test.tsx`,
`tests/vitest/ui/content-type-table.test.tsx`,
`tests/vitest/ui/content-type-list-parity.test.tsx`,
`tests/vitest/ui/content-type-preview-panel.test.tsx`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/engine-content-type-list-restyle.test.tsx tests/vitest/ui-integration/engine-content-type-editor-restyle.test.tsx tests/vitest/ui-integration/engine-schema-builder-restyle.test.tsx tests/vitest/ui-integration/engine-collection-workspace-restyle.test.tsx tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx`
- Then the full existing engine lane:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui/schema-builder.test.tsx tests/vitest/ui/collection-workspace.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/content-type-preview-panel.test.tsx`
- State in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-12-L05`.
- `_docs/TESTING_STRATEGY.md` — list the new `engine-*` ui-integration suites if
  the strategy doc enumerates admin/UI suites.
