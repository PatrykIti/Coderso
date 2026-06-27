# TASK-479-14-L05: Custom Screens Tests
# FileName: TASK-479-14-L05-Custom-Screens-Tests.md

**Priority:** Medium
**Category:** Admin UI / Custom Screens / Visual Refresh / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-14-L01, TASK-479-14-L02, TASK-479-14-L03, TASK-479-14-L04
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-14
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

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
  entry layout, bottom formatting toolbar) while the core behaviors (published
  flag, sidebar shortcut wiring, dirty-state, definition write, column toggle,
  inline edit, per-screen presentation, AdminLink prefetch) still work.
- **Owning module/service:** new suites under `tests/vitest/ui-integration/` —
  `custom-screen-list-restyle.test.tsx`, `custom-screen-editor-restyle.test.tsx`,
  `custom-screen-entries-restyle.test.tsx`,
  `custom-screen-entry-editor-restyle.test.tsx` — exercising
  `core/admin/ui/custom-screens/{CustomScreenListPage,CustomScreenEditorPage,CustomScreenEntriesPage,CustomScreenEntryEditor}.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane); the
  prototype screens under `_docs/_PROTOTYPE/src/pages/advanced/`; and the existing
  `tests/vitest/ui/custom-screen*.test.{ts,tsx}` suites used as fixture/setup
  references.
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

Mirror the setup of the existing custom-screen suites (mock `customScreensClient` /
`customScreenShortcutsClient` / `cachePolicy` / entries client, seed the cached
screen definition + entries, wrap in the `AdminRouter` / shell test providers
already used by `tests/vitest/ui/custom-screens-page.test.tsx` and
`custom-screen-records.test.tsx`). Assert on stable, semantic signals — accessible
roles/text and load-bearing class tokens — not brittle full-class snapshots.

```tsx
// tests/vitest/ui-integration/custom-screen-list-restyle.test.tsx
describe("Custom screen list restyle", () => {
  it("renders soft cards with the In-sidebar badge only for published screens", () => {
    seedScreens([screen({ id: "project-catalog", published: true }), screen({ id: "draft-x", published: false })]);
    renderCustomScreenListPage();
    expect(screen.getByRole("heading", { name: /screens/i })).toBeInTheDocument();
    const cards = screen.getAllByTestId("custom-screen-card"); // or query by name
    expect(cards.some((c) => c.className.includes("rounded-2xl"))).toBe(true);
    expect(within(cardFor("project-catalog")).getByText(/in sidebar/i)).toBeInTheDocument();
    expect(within(cardFor("draft-x")).queryByText(/in sidebar/i)).not.toBeInTheDocument();
  });
  it("Edit/Open route through canonical AdminLink hrefs (no hand-built path)", () => {
    seedScreens([screen({ id: "project-catalog", published: true })]);
    renderCustomScreenListPage();
    expect(linkFor("Open").getAttribute("href")).toMatch(/\/advanced\/custom-screens\/project-catalog\/entries/);
  });
  it("New screen still opens the create drawer", async () => {
    renderCustomScreenListPage();
    await userEvent.click(screen.getByRole("button", { name: /new screen/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx
describe("Custom screen entry-view builder restyle", () => {
  it("renders the max-w-2xl canvas + floating inspector with real bound fields", () => {
    renderCustomScreenEditorPage(seededDefinition()); // Entry-view tab
    expect(screen.getByText(/entry-view builder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bound field/i)).toBeInTheDocument(); // Select over REAL columns
  });
  it("editing a block flips hasUnsavedChanges (model not severed)", async () => {
    const { store } = renderCustomScreenEditorPage(seededDefinition());
    await editFirstBlock();
    expect(store.hasUnsavedChanges()).toBe(true);
  });
});

// tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx
describe("Published List View restyle", () => {
  it("renders Published banner, stats, rounded-2xl table", () => {
    seedScreenWithEntries("project-catalog");
    renderCustomScreenEntriesPage("project-catalog");
    expect(screen.getByText(/published/i)).toBeInTheDocument();
    expect(screen.getByRole("table").closest("[class*='rounded-2xl']")).toBeTruthy();
  });
  it("Customize view toggles the config panel and column toggle hides a column", async () => {
    seedScreenWithEntries("project-catalog");
    renderCustomScreenEntriesPage("project-catalog");
    await userEvent.click(screen.getByRole("button", { name: /customize view/i }));
    const colToggle = screen.getByRole("checkbox", { name: /budget/i });
    await userEvent.click(colToggle);
    expect(screen.queryByRole("columnheader", { name: /budget/i })).not.toBeInTheDocument();
  });
  it("title cell links via the canonical workspace href", () => {
    seedScreenWithEntries("project-catalog");
    renderCustomScreenEntriesPage("project-catalog");
    expect(firstTitleLink().getAttribute("href")).toMatch(/\/advanced\/custom-screens\/project-catalog\/entries\//);
  });
});

// tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
describe("Entry content editor restyle (per-screen presentation)", () => {
  it("renders the screen-defined layout in a document card with the bottom toolbar", () => {
    renderEntryEditor("project-catalog", 1);
    const card = screen.getByTestId("entry-document-card");
    expect(card.className).toMatch(/rounded-2xl/);
    expect(screen.getByRole("button", { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /link/i })).toBeInTheDocument();
  });
  it("presentation differs per screen (Projects=checklist, Clients=activity)", () => {
    renderEntryEditor("project-catalog", 1);
    expect(screen.getByText(/milestones/i)).toBeInTheDocument(); // checklist section
    cleanup();
    renderEntryEditor("clients", 1);
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument(); // activity section
  });
  it("inline edit flips the draft/override dirty indicator", async () => {
    const { store } = renderEntryEditor("project-catalog", 1);
    await editRichBlock("updated");
    expect(store.hasUnsavedPresentationChanges() || store.isDraftDirty()).toBe(true);
  });
});
```

**Data flow:** each suite seeds cache/definition/entries → renders the real
component through the shared test providers → asserts DOM/role/text + load-bearing
tokens (`rounded-2xl`, `shadow-card`, "In sidebar", "Published", "Customize view")
→ drives one behavioral path per surface (published badge ↔ published flag,
block-edit → dirty, column toggle → hidden column, per-screen variant, inline edit
→ dirty) to prove the restyle preserved wiring.

**Error handling:** keep assertions resilient — query by accessible role/name and
`toMatch` / `class*=` token checks instead of exact className strings, so future
token tweaks from TASK-479-05/06 do not falsely fail these suites.

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
- Full Custom Screens regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screen-record-interactions.test.tsx tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/ui/custom-screen-editor-binding-flow.test.tsx tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screen-route-params.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-14-L05`.
- Note the four new `ui-integration` Custom Screens restyle suites in any
  test-inventory doc that lists the Custom Screens coverage, so the restyle guards
  are discoverable alongside the existing `custom-screen-*` suites.
