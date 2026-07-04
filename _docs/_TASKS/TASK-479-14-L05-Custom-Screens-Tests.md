# TASK-479-14-L05: Custom Screens Tests
# FileName: TASK-479-14-L05-Custom-Screens-Tests.md

**Priority:** Medium
**Category:** Admin UI / Custom Screens / Visual Refresh / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-14-L01, TASK-479-14-L02, TASK-479-14-L03, TASK-479-14-L04
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-14
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Add Vitest render tests that lock in the restyle of all **four** Custom Screens
surfaces — management list, entry-view builder, published List View, and entry
content editor — and confirm the restyle did not regress any data / cache / draft /
override / capability behavior. These are presentation guards layered on top of the
existing `custom-screen-*` behavioral suites, not a replacement for them, and must
be reconciled with those suites so the family stays green.

- **Goal:** Four new Vitest suites that render the real Custom Screens components
  and assert the prototype look is present (rounded-2xl cards, "In sidebar" badge,
  floating-panel canvas, published banner + "Customize view" panel, per-screen
  entry layout, bottom formatting toolbar) while the core behaviors (in-sidebar
  state via `resolveCustomScreenSidebarShortcutState`, sidebar shortcut wiring,
  dirty-state, the editor's definition write, LOCAL column toggle, inline edit,
  per-screen presentation, AdminLink prefetch) still work.
- **Owning module/service:** new suites under `tests/vitest/ui-integration/` —
  `custom-screen-list-restyle.test.tsx`, `custom-screen-editor-restyle.test.tsx`,
  `custom-screen-entries-restyle.test.tsx`,
  `custom-screen-entry-editor-restyle.test.tsx` — exercising
  `core/admin/ui/custom-screens/{CustomScreenListPage,CustomScreenEditorPage,CustomScreenEntriesPage,CustomScreenEntryEditor}.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane); the
  prototype screens under `_docs/_PROTOTYPE/src/pages/advanced/`; the SSR-string
  helper `tests/utils/adminRouterRender.tsx`; and the existing
  `tests/vitest/{ui,ui-integration}/custom-screen*.test.{ts,tsx}` suites used as
  fixture/setup references — static idiom:
  `tests/vitest/ui/custom-screens-page.test.tsx` /
  `tests/vitest/ui/custom-screen-records.test.tsx`; interactive idiom:
  `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`.
- **Out of scope:** No runtime (browser) tests; no new product code (L01–L04 own
  the components). Do not move existing runtime tests into Vitest for coverage. Do
  not weaken the existing behavioral suites — only update selectors/markup
  assertions that the restyle genuinely moved.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Use the repo's REAL Vitest idioms — this repo has **no** `@testing-library/react`,
`jest-dom`, or `user-event`, so do NOT use `@testing-library` `render` /
`screen.getByRole` / `within` / `toBeInTheDocument` / `userEvent` / the RTL
auto-`cleanup` (instead unmount via the `createRoot` root returned from `mount`).
Mirror the two idioms the existing custom-screen suites already use:

- **Static look** → `renderAdminUi(<Component/>, { path })` from
  `tests/utils/adminRouterRender` (the helper is `tests/utils/adminRouterRender.tsx`).
  It returns a server-rendered **HTML string**; assert with `html.toContain(...)` /
  `expect(html).toMatch(/…/)`. This is the idiom of
  `tests/vitest/ui/custom-screens-page.test.tsx` and
  `tests/vitest/ui/custom-screen-records.test.tsx`. Seed data by writing the cache
  keys (`cacheKeys.customScreensList`, `cacheKeys.customScreenDetail(id)`,
  `cacheKeys.entriesList(slug)`) onto a stubbed `globalThis.localStorage`, exactly
  as `custom-screens-page.test.tsx` does.
- **Interactive behavior** (click → drawer, "Customize view" toggle, column toggle,
  edit → dirty) → put `// @vitest-environment happy-dom` at the top of the file, then
  mount with `createRoot` inside `React.act` wrapped in `AdminRouterProvider`
  (`core/admin/ui/contexts/AdminRouterContext`), drive `vi.mock`ed
  `customScreensClient`/`entriesClient`, query with `container.querySelector(...)`,
  click real DOM nodes (`node.click()` inside `React.act`), and `flush()` microtasks.
  This is the idiom of
  `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`.

`renderAdminUi` (SSR string) also runs fine under `happy-dom`, so a single
`// @vitest-environment happy-dom` suite may mix static-string checks and
`createRoot` interaction. Assert on stable signals — text + load-bearing class
tokens (`rounded-2xl`, `shadow-card`, "In sidebar", "Published", "Customize view") —
not brittle full-class snapshots. Do **not** assert post-click / hidden-after-toggle
/ inactive content via the SSR `renderAdminUi` string (it is a single static
snapshot); route every such assertion through the `createRoot` interactive path.

```tsx
// Shared helpers (sketch) — mirror custom-screens-page.test.tsx (static) and
// custom-screen-record-interactions.test.tsx (interactive):
//   seedCustomScreensCache(rows)  -> stub globalThis.localStorage, write
//                                    cacheKeys.customScreensList = { value: rows, savedAt }
//   screenFixture({ id, status, showInSidebar, definition, blocks, bindings })
//       -> REAL CustomScreenRecord shape: status "draft"|"active" (NOT "published"),
//          showInSidebar boolean, blocks: WidgetBlock[], bindings: CustomScreenBinding[].
//          "In sidebar" === resolveCustomScreenSidebarShortcutState(screen) === "visible".
//   mount(node, path) -> createRoot inside React.act, wrapped in <AdminRouterProvider
//                        initialPath={path}>; returns { container, cleanup }.
//   flush() -> await React.act(async () => { for (…6) await Promise.resolve(); }).
//   findButton(container, label) -> [...container.querySelectorAll("button")]
//                                   .find(b => b.textContent?.includes(label)).

// tests/vitest/ui-integration/custom-screen-list-restyle.test.tsx
// @vitest-environment happy-dom
import { renderAdminUi } from "../../utils/adminRouterRender";

test("renders soft cards; In-sidebar badge only for the active+showInSidebar screen", () => {
  seedCustomScreensCache([
    screenFixture({ id: "project-catalog", status: "active", showInSidebar: true }), // -> "visible"
    screenFixture({ id: "draft-x", status: "draft", showInSidebar: false }),
  ]);
  const html = renderAdminUi(<CustomScreenListPage />, { path: "/admin/advanced/custom-screens" });
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("In sidebar");                 // present for project-catalog
  // scope the "In sidebar" check to the active card and assert the draft card lacks it
  // (e.g. split html around the card names) — derive the badge from
  // resolveCustomScreenSidebarShortcutState === "visible", never a `published` field.
});

test("Open link uses the canonical workspace href (AdminLink, no hand-built path)", () => {
  seedCustomScreensCache([screenFixture({ id: "project-catalog", status: "active", showInSidebar: true })]);
  const html = renderAdminUi(<CustomScreenListPage />, { path: "/admin/advanced/custom-screens" });
  expect(html).toMatch(/href="[^"]*\/advanced\/custom-screens\/project-catalog\/entries/);
});

test("New opens the create drawer (interactive)", async () => {
  seedCustomScreensCache([]);
  const { container, cleanup } = mount(<CustomScreenListPage />, "/admin/advanced/custom-screens");
  await flush();
  React.act(() => { findButton(container, "New")?.click(); });
  await flush();
  expect(container.textContent).toMatch(/create|new screen/i); // create drawer copy
  cleanup();
});

// tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx
// @vitest-environment happy-dom
test("renders the max-w-2xl canvas + floating inspector over REAL bound fields", () => {
  seedCustomScreenDetail(seededDefinition()); // V4 definition with real listView columns
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/project-catalog/edit",
  });
  expect(html).toContain("max-w-2xl");
  expect(html).toMatch(/Bound field/);   // Select label, options = REAL definition columns
  expect(html).toMatch(/\{\{\s*\w/);      // {{ field }} binding tokens from real columns
});

test("editing a block surfaces the unsaved-changes affordance (model not severed)", async () => {
  seedCustomScreenDetail(seededDefinition());
  const { container, cleanup } = mount(<CustomScreenEditorPage />, "/admin/advanced/custom-screens/project-catalog/edit");
  await flush();
  // assert the DOM reflection of dirty state (Save enabled / "Unsaved" marker), NOT an
  // internal store handle — there is no test store on the component.
  React.act(() => { editFirstBlock(container); }); // e.g. type into an InspectorRow input
  await flush();
  const save = findButton(container, "Save");
  expect(save?.disabled).toBe(false); // hasUnsavedChanges -> Save enabled
  cleanup();
});

// tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx
// @vitest-environment happy-dom
test("renders Published banner, stats, rounded-2xl table", () => {
  seedScreenWithEntries("project-catalog"); // detail + entriesList caches
  const html = renderAdminUi(<CustomScreenEntriesPage />, {
    path: "/admin/advanced/custom-screens/project-catalog/entries",
  });
  expect(html).toContain("Published");
  expect(html).toContain("rounded-2xl"); // table wrapper token
});

test("title cell links via the canonical workspace href", () => {
  seedScreenWithEntries("project-catalog");
  const html = renderAdminUi(<CustomScreenEntriesPage />, {
    path: "/admin/advanced/custom-screens/project-catalog/entries",
  });
  expect(html).toMatch(/href="[^"]*\/advanced\/custom-screens\/project-catalog\/entries\//);
});

test("Customize view toggles the panel and a column toggle hides that column (interactive)", async () => {
  seedScreenWithEntries("project-catalog");
  const { container, cleanup } = mount(<CustomScreenEntriesPage />, "/admin/advanced/custom-screens/project-catalog/entries");
  await flush();
  React.act(() => { findButton(container, "Customize view")?.click(); });
  await flush();
  const header = () => [...container.querySelectorAll("th")].some((th) => /budget/i.test(th.textContent ?? ""));
  expect(header()).toBe(true);
  const toggle = [...container.querySelectorAll('input[type="checkbox"]')].find(/* the Budget row */);
  React.act(() => { (toggle as HTMLInputElement)?.click(); });
  await flush();
  expect(header()).toBe(false); // LOCAL view state hides the column (no definition write)
  cleanup();
});

// tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
// @vitest-environment happy-dom
test("renders the screen-defined layout in a document card with the bottom toolbar", () => {
  seedEntryEditor("project-catalog", 1); // definition + record + overrides caches
  const html = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/project-catalog/entries/1",
  });
  expect(html).toMatch(/rounded-2xl/);
  expect(html).toMatch(/shadow-card/);
  expect(html).toMatch(/aria-label="Bold"|>Bold</);
  expect(html).toMatch(/aria-label="Link"|>Link</);
});

test("presentation is data-driven by related.variant (checklist vs activity)", () => {
  // Drive off the definition, NOT a hardcoded screen id or prototype mock copy.
  seedEntryEditor("checklist-screen", 1, { relatedVariant: "checklist" });
  const checklistHtml = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/checklist-screen/entries/1",
  });
  expect(checklistHtml).toMatch(/data-related-variant="checklist"|role="checkbox"/);

  seedEntryEditor("activity-screen", 1, { relatedVariant: "activity" });
  const activityHtml = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/activity-screen/entries/1",
  });
  expect(activityHtml).toMatch(/data-related-variant="activity"/);
});

test("inline edit surfaces the draft/override dirty affordance (interactive)", async () => {
  seedEntryEditor("project-catalog", 1);
  const { container, cleanup } = mount(<CustomScreenEntryEditor />, "/admin/advanced/custom-screens/project-catalog/entries/1");
  await flush();
  React.act(() => { editRichBlock(container, "updated"); }); // real inline-edit on the active block
  await flush();
  // dirty reflected in the DOM: Save/Publish enabled or an "Unsaved" marker present.
  expect(findButton(container, "Save")?.disabled).toBe(false);
  cleanup();
});
```

**Data flow:** each suite seeds cache/definition/entries → renders the real
component via `renderAdminUi` (static HTML string) or `createRoot`+`React.act`
(interactive) → asserts text + load-bearing tokens (`rounded-2xl`, `shadow-card`,
"In sidebar", "Published", "Customize view") → drives one behavioral path per
surface (In-sidebar badge ↔ `resolveCustomScreenSidebarShortcutState === "visible"`,
block-edit → Save-enabled, column toggle → hidden column via LOCAL view state,
related.variant → checklist/activity, inline edit → dirty affordance) to prove the
restyle preserved wiring.

**Error handling:** keep assertions resilient — assert via `html.toContain` /
`expect(html).toMatch(/…/)` on the SSR string and `container.querySelector(...)` /
`textContent` in the interactive path (NO RTL `getByRole`/`within`/`jest-dom`),
using token substrings instead of exact className strings, so future token tweaks
from TASK-479-05/06 do not falsely fail these suites.

**Regression-test shape:** the four new suites above PLUS a green run of the
existing `custom-screen-*` behavioral family. Where the restyle moved a selector,
update the minimal query, not the assertion intent; do NOT delete behavioral
assertions. Explicitly reconcile any literal class/markup assertions in
`custom-screens-page.test.tsx`, `custom-screen-records.test.tsx`,
`custom-screen-record-interactions.test.tsx`, and
`custom-screen-list-view-canvas.test.tsx` that the restyle intentionally changed.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-list-restyle.test.tsx tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx`
- Full Custom Screens regression sweep (must stay green; paths verified on disk —
  `record-interactions` and `editor-binding-flow` live under `ui-integration`):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screen-route-params.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-14-L05`.
- Note the four new `ui-integration` Custom Screens restyle suites in any
  test-inventory doc that lists the Custom Screens coverage, so the restyle guards
  are discoverable alongside the existing `custom-screen-*` suites.
