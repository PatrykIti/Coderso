# TASK-497-03: Posts Tests, Docs & Closure
# FileName: TASK-497-03-Posts-Tests-Docs-Closure.md

**Parent Task:** TASK-497
**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Posts) / QA / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-497-01 (Posts list restyle), TASK-497-02 (Post editor restyle + `EditorRail` port), TASK-479 (redesign tokens shipped), TASK-479-09 (Posts screen migrated to redesign tokens — Done 2026-06-29), TASK-496 (shared editor-chrome precedent — Done, changelog 1205)
**Status:** 🚧 In Progress (REOPENED — its dependency TASK-497-02 was re-scoped to prototype
parity after the owner rejected the first editor pass; per AGENTS.md "if any task/test/validation-
contract file changes after the pass, that pass is obsolete", this closure leaf cannot be Done
ahead of the re-scoped 497-02. Its editor Restyle-Assertions + suite partition + changelog below
are rewritten to the re-scoped editor: in-page `PageHeader` above a framed `rounded-2xl …
shadow-card` card, a unified Blocks-default three-tab rail with Outline + List relocated to
sibling tabs. The first-pass "single chrome strip / Outline-default / mutually-exclusive rail"
guidance is REMOVED — it re-asserted the dropped ~~D4~~/~~B6~~.)

---

## Overview

Closure leaf for **TASK-497**. After 497-01 restyles the Posts **list**
(`PostsListPage.tsx` + `PostsTable.tsx` in place — quiet header, `shadow-soft`,
lean columns, first-name author, row-click nav, copy/label parity) and 497-02
restyles the Post **editor** to prototype parity (in-page `PageHeader` +
framed `rounded-2xl … shadow-card` card + a single muted chrome bar with
autosave badge / undo-redo / device toggle / the six app toggles; a
**Blocks**-default left `EditorRail` rail with Outline + List relocated to
sibling tabs; flat "Post settings" inspector) **without changing the block
model / autosave / revisions / preview / status / shortcuts**, this leaf:

1. adds the **restyle assertions** (list waves extended + a new editor chrome
   wave) that pin the new look so it cannot silently regress;
2. proves **every existing posts functional suite stays green, untouched** — no
   assertion weakened to fit the restyle (the block model, autosave, revisions,
   runtime preview, status, bulk actions, create drawer, keyboard shortcuts, and
   every `data-post-editor-*` hook + `aria-pressed`/`aria-controls` are preserved
   by 497-01/02, so their suites must pass as-is);
3. runs the full validation matrix (lint / types / vitest / test:bun /
   `gates:coderso`) + a runtime smoke of the list and editor;
4. writes the docs note (**pure restyle — no contract change**), the changelog
   entry, and the board + Statistics closure.

This leaf adds **no behavior** and **no production code** beyond the new test
file(s). It is bookkeeping + a regression fence. Background:
**[[pages-editor-v2-remediation-program]]** (sibling Pages-editor restyle
precedent), **[[admin-ui-redesign-prototype]]** (the wave/drift-verify + gates
close-out norm this leaf mirrors), **[[page-editor-color-toolbar-live-findings]]**
(why synthetic-event passing is not enough — real-input smoke required).

- **Goal:** the TASK-497 restyle is mechanically locked: the list table is quiet
  (`PostsTable.tsx` no longer carries `bg-muted/40`/`uppercase` header chrome,
  container is `shadow-soft`), the editor renders an in-page `PageHeader` + framed
  card + single chrome bar with the **Blocks**-default rail + flat inspector, and
  **all** preserved-functionality suites are green with no weakened assertions.
- **Owning files touched (tests + docs only):**
  - **REPLACE (NOT new — already committed on `feature/visual` from the rejected first pass):**
    `tests/vitest/ui/posts-editor-chrome-wave.test.tsx`. It currently mocks
    `leftRailMode:"outline"` and asserts only the first-pass chrome (no PageHeader / no framed
    card / no Blocks-default tab); **overwrite** its describe body with the re-scoped regression
    shape (PageHeader description + `data-post-editor-frame` + Blocks-default three-tab rail), do
    **not** append a second describe leaving the stale outline-default assertions green. Because
    the file already exists, this re-scope does **not** add a test file (the earlier "+1 new file"
    accounting no longer applies — re-confirm the live file count at implementation time).
  - **Extend (add restyle cases, keep functional cases):**
    `tests/vitest/ui/posts-list.test.tsx`, `tests/vitest/ui/posts-table-wave.test.tsx`.
  - **Update (presentation re-baseline — these existing suites render the REAL header/
    inspector/list and assert the first-pass chrome the restyle changes; re-point only the
    changed strings, keep every functional assertion):**
    `tests/vitest/ui/post-document-inspector-wave.test.tsx`,
    `tests/vitest/ui/page-post-list-wave.test.tsx` (the **Posts**-side create-button
    exact-match lookups break on the 497-01 `"New" → "New post"` relabel — see the
    "List copy re-baseline" subsection below; **Pages** lookups stay `=== "New"`),
    `tests/vitest/ui-integration/post-document-inspector.test.tsx`,
    `tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx`,
    `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`,
    `tests/vitest/ui-integration/post-editor-layout-shell.test.tsx`,
    `tests/vitest/ui-integration/post-editor-writing-canvas-flow.test.tsx`
    (exact lines in TASK-497-02 "PRESENTATION-LOCK suites"). All are edits to **existing**
    files (no new file added by them).
  - **Docs:** `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/` (+ its `README.md` index).
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (suite conventions),
  `_docs/DESIGN_TOKENS.md` (soft/violet tokens the restyle adopts). The post
  document model is **read-only** here — this leaf must not edit it, because the
  restyle changed no model, route, or payload.
- **Out of scope:** any functional change to Posts; any edit to the classic editor
  (`PostClassicEditorShell` — out of scope per TASK-497, only smoke-verified on
  redesign tokens); any new test for `PostsFeed` **widget** editors
  (`tests/vitest/ui/posts-feed-editor-wave.test.tsx` covers the *widget*, not the
  posts list/editor — do **not** touch it here); changing the `bun test` /
  `vitest` runner config.

---

## Security Contract

**UI-only restyle — no security-relevant change.** This leaf adds test files and
edits docs/changelog/board. It introduces **no** route, endpoint, RBAC/permission,
CSRF, cache, `adminPaths`, or preview-token change. TASK-497 as a whole is a pure
**visual restyle**: the list keeps its existing `postsClient` reads + controlled
bulk-selection + `PageRowActions` wiring; the editor keeps every
`usePostEditorState`/`postEditorStore` flow (autosave/publish/revisions/preview)
and every `data-post-editor-*` hook + `aria-pressed`/`aria-controls`/`aria-label`
intact. There is **no contract surface to review** — the validation below must
**confirm** that invariant (the preserved-functionality suites are green
unchanged), and the changelog must state explicitly that **no contract doc
required an edit**. The smoke check must confirm no auth guard, status gate, or
bulk-action permission was altered as restyle collateral.

---

## Restyle Assertions — what to pin (verified against real source)

All anchors below were verified against the current tree (pre-restyle); the
assertions encode the **target** (post-restyle) values.

### List — extend `tests/vitest/ui/posts-list.test.tsx` (renders `<PostsListPage />`)

| Assert | Current anchor (pre-restyle) | Target |
|---|---|---|
| Header copy | `PostsListPage.tsx:433` `description="Create and publish articles rendered by widgets and templates."` | `toContain("Write, schedule, and publish blog posts")` |
| Primary button label | button "New" (`:481-483`) | `toContain("New post")` (the create-drawer still opens — do **not** assert a bare editor `Link`) |
| Status tabs unchanged | `StatusTabs` `:500` | counts still render (existing) |
| Filter row | `PageFilters` `:501-511` | **kept** (consistency with Pages) — assert it still renders (no swap to a fixture-only borderless FilterBar) |
| Pagination footer | `ListPaginationFooter resourceLabel="posts"` `:533` | unchanged — existing `"Showing 1-1 of 1 posts"` / `"Previous"` / `"Next"` assertions (`:66-68`) stay green |

> The existing `posts-list.test.tsx:27` `expect(html).toContain("New")` stays true
> as a substring of "New post"; **add** an explicit `toContain("New post")` plus a
> `toContain("Write, schedule, and publish blog posts")` (there is no existing
> description assertion today).

### List — extend `tests/vitest/ui/posts-table-wave.test.tsx` (mounts `<PostsTable />`)

This suite already mounts `PostsTable` with mocked `@/components/ui/table` that
renders `<thead>/<th>/<tr>/<td>` **without classNames/onClick** (`:14` `TableCell`,
`:27-29` `TableHead`/`TableHeader`/`TableRow`). To assert the restyle, **extend
those mocks to forward `className` + `onClick`** (per TASK-497-01's regression
shape), then:

- **Quiet header / shadow:** the wrapper `div` (`PostsTable.tsx:77`,
  `shadow-card` → **`shadow-soft`**) is rendered by `PostsTable` itself (not the
  table mock), so assert the container className contains `shadow-soft` and **not**
  `shadow-card`; assert the `<thead>` no longer carries `bg-muted/40` and no header
  `<th>` carries `uppercase`/`tracking-wider` (dropped from `:79`,`:88-106`).
- **Lean columns:** assert the header row contains **Title / Status / Author /
  Published / Actions** and **does not** contain a `Comments` header, nor
  `Categories`/`Tags`, nor `Updated`. (Current header set is at `:88-108`.)
- **Slug subtitle kept (no fabricated category):** assert the slug still renders
  in mono under the title (`:144` `break-all font-mono text-xs`). Do **not** assert
  a category subtitle (no field on `PostSummary`).
- **First-name author:** with `author.name = "Admin User"`, assert the author cell
  shows `"Admin"` and not `"Admin User"` (restyle of `:167-169` to `name.split(" ")[0]`);
  `Avatar` + initials fallback (`toInitials`, `:31`/`:164`) preserved.
- **Row-click nav + title link preserved:** assert the title `<a>` `href` is
  `/posts/{id}` (existing `:263` `"/posts/post-1"`); assert the row carries
  `cursor-pointer` and an `onClick` that navigates (new in 497-01), and that the
  checkbox cell + actions cell `stopPropagation` (clicking them does **not** fire
  row nav).
- **Selection/bulk preserved (must stay green untouched):** the existing tests
  "controls header and row selection state" and "exposes indeterminate header
  state" (`:332`) and the `aria-label="Select all posts"` (`:83`) /
  `aria-label="Select {title}"` (`:125`) controlled checkboxes and `PageRowActions`
  callback forwarding (`:230-283`, incl. the `/posts/post-1` href `:263` + `onEdit`
  forwarding `:274`) must pass **unchanged** for behavior — keep the selection cases
  as-is and only update the **tag-text** expectations to the lean-column ones.

### List copy re-baseline — `tests/vitest/ui/page-post-list-wave.test.tsx` (renders the REAL `PostsListPage` **and** `PageListPage`)

The 497-01 create-button relabel **`"New" → "New post"`** (Posts only — the Pages list is
**untouched**) breaks this suite's **exact-match** create-button lookups. It is neither a
functional-untouched suite nor previously listed, so it must be re-baselined here; re-point
**only the Posts-side lookups**, leave every Pages-side lookup as-is:

- `:1364` and `:1598` — inside `mount(<PostsListPage />)` tests:
  `buttons().find((b) => b.textContent === "New")` → match the new label
  (`b.textContent === "New post"`, or `b.textContent?.startsWith("New")`); otherwise `.find`
  returns `undefined`, the create drawer never opens, and the dependent assertions go RED.
- `:1716` — the combined `mount(<><PageListPage/><PostsListPage/></>)` test (`:1694-1699`)
  selects the **Posts** "New" via `.filter((b) => b.textContent === "New")[1]`; after the
  relabel only the Pages button matches `=== "New"`, so index `[1]` is `undefined` → re-point
  to `.find((b) => b.textContent === "New post")`.
- **LEAVE the Pages-side lookups `=== "New"` untouched** — `:887`, `:1054`, and the FIRST
  match in the combined test `:1713`. 497-01 does **not** relabel the Pages list, so a blanket
  find-replace would wrongly break Pages. The substring `indexOf("New")` checks (`:1150`
  Pages, `:1317` Posts) stay green ("New" is still a substring of "New post").

### List bulk + create drawer — `tests/vitest/ui/posts-create-drawer-a11y.test.tsx`

Stays green **untouched** — the create drawer and its dialog-description wiring
(`PostsCreateDrawer` / `PostRevisionDrawer`) are preserved by 497-01.

### Editor — REPLACE (already-committed) `tests/vitest/ui/posts-editor-chrome-wave.test.tsx`

Render the block-editor shell the same way the existing editor wave tests do
(`post-block-editor-shell-wave.test.tsx` / `post-editor-layout-render-wave.test.tsx`
are the render pattern to copy — same mocks for `usePostEditorState`/store). Pin:

- **In-page `PageHeader` + framed card + single muted chrome bar (B1 — re-scoped, primary):**
  assert an in-page shared `PageHeader` renders the description
  `"Write, format, and publish your story."` + Preview/Publish in `PageHeader.actions`, ABOVE a
  framed card (`data-post-editor-frame="true"` whose className contains `rounded-2xl` +
  `shadow-card`). Inside the card, the secondary toolbar row
  `data-post-editor-header-row="secondary"` (removed by the first pass — **no** secondary row
  exists in the current tree; `PostEditorHeader.tsx:108` is the sole `="primary"` row) stays
  **gone / merged** into one chrome bar, and the header region surface (`PostEditorRegions.tsx:12`,
  **already** `bg-muted/40` in the first-pass tree — the pre-first-pass
  `border-b bg-background/95 backdrop-blur` is history) reads the muted chrome token (`bg-muted/40`).
  The primary row (`PostEditorHeader.tsx:108`, `data-post-editor-header-row="primary"`) survives.
- **Toggles preserved as a11y controls (B1):** the Add block / Outline / Details /
  Focus / Revisions controls keep their `aria-pressed` + `aria-controls`
  (`post-editor-block-inserter` `:189`, `post-editor-document-overview` `:206`,
  `post-editor-details` `:223`) even after being demoted to icon buttons — assert
  each is present and toggleable (guards `usePostEditorShortcuts`).
- **Autosave badge states (B2):** the sync presentation (`data-post-editor-sync-state="true"`)
  still reaches all dynamic strings — `"Saving..."`, `"Unsaved changes"`, `"Saved at …"`,
  `"Synced"` — **already** a `Badge`; assert the text is **dynamic, not hardcoded**.
  **RELOCATION NOTE (like B1/B6):** the `PostEditorActionCluster.tsx` anchors (`:56` Badge,
  `:43`/`:45`/`:47`/`:48` strings) are the **pre-restyle SOURCE** — TASK-497-02 E3/E4 **move**
  the sync `Badge` (and undo/redo) OUT of `PostEditorActionCluster` INTO the **card chrome bar**
  (`PostEditorHeader`, 497-02:366,:457,:462-463), while E3 moves the whole cluster into the in-page
  `PageHeader` actions. So keep the assertion **container-agnostic** — query
  `[data-post-editor-sync-state="true"]` (and/or scope to the chrome bar
  `[data-post-editor-region="header"]`), **NOT** the `PageHeader` — matching the prototype, where
  the badge feeds the card chrome `toolbar` slot (`EditorPreviewFrame.tsx:44-45`), not the page
  header. No test-assertion change is needed (497-02:766 already queries it container-agnostically).
- **Actions wired (B3/B4):** Preview (`Eye`, `:95`) present; Publish flips
  `"Publish"`→`"Update"` when `status === "published"` (`:123`) with its `aria-label`
  (`:120`) intact; optional Save draft present and wired; **undo/redo** buttons
  present and **disabled when `canUndo`/`canRedo` are false** (the store exposes
  both — `usePostEditorState.ts:302-303`, derived `:1051-1052`).
- **Unified Blocks-default three-tab rail + EditorRail consumption (B6/B9 — re-scoped):** the
  secondary-sidebar region (`PostEditorRegions.tsx:49`, **already** `bg-muted/20` in the first-pass
  tree — the pre-first-pass `border-r bg-background` is history) reads
  `bg-muted/20`. Per TASK-497-02 Extension #1, the left rail is **ONE always-open panel** with a
  segmented control **Blocks | Outline | List**, all three tabs present in a **single** render via
  `forceMount`, **defaulting to Blocks** — assert all three
  `data-post-editor-left-rail-tab="blocks"|"outline"|"list-view"` are present and that the default
  is Blocks (`data-post-editor-left-rail-mode="blocks"` on the rail root). The **Blocks** palette
  wraps its sections in the ported `EditorRailGroup` (assert a `[data-editor-rail-group]` element
  is present — this is the AC#5 consumption point that keeps
  `core/admin/ui/shared/EditorRail.tsx` from shipping as a dead module), and each kept
  `<Button role="option">` row carries the rail active class
  `bg-primary-soft text-primary-soft-foreground` via `className` (NOT a literal `EditorRailItem`
  element — the listbox roving-keyboard a11y is preserved). **The old "mutually exclusive /
  `showInserter ? <PostInserterSidebar/> : <PostListViewSidebar/>` / never coexist / do not
  co-assert the outline tab" model is REMOVED** — it described the rejected first pass and
  re-introduced the dropped ~~B6~~ (Outline default). Under the re-scope the Blocks palette (the
  `[data-editor-rail-group]` host) and the Outline + List sibling tabs **DO** coexist in one
  render, so co-assert all three. The Outline tab keeps the re-homed
  `data-post-editor-outline-insert="true"` dropdown (TASK-497-02 E2).
- **Right inspector (B7/B10):** the sidebar region (`PostEditorRegions.tsx:64`,
  **already** `bg-card` in the first-pass tree — the pre-first-pass `border-l bg-background` is
  history) reads `bg-card`; the Post tab shows a flat
  "Post settings" header + a status badge (today `DocumentInspector.tsx:119`
  `<StatusBadge status={status} />` maps draft→`secondary` at `StatusBadge.tsx:29`).
  **Keep the shared StatusBadge** — assert the header renders the capitalized status
  text (e.g. `"Draft"`); do **not** assert a `soft`-only class (the prototype's soft
  Draft is an optional cosmetic, and the shared map is not forked). The heavy
  `InspectorSection` cards (`InspectorSection.tsx:33` `space-y-3 rounded-xl border p-3`)
  are flattened to label-over-control rows with a **single** muted SEO sub-card
  (`bg-muted/30`); **the Block tab is still present** —
  `data-post-editor-details-tab-trigger="block"` (`:52`) and `"document"` (`:46`)
  must remain and be enabled after a block is selected.
- **Canvas guard (B8):** the canvas keeps `bg-dotted` (`PostEditorCanvas.tsx:1354`)
  + the centered `max-w-2xl rounded-2xl … shadow-card` page frame (`:1359`) and the
  `data-post-editor-canvas="article"` (`:1356`) + `data-post-editor-title-input="true"`
  (`:1374`) hooks; assert no fixture byline ("By Alex Rivera…") was introduced.

---

## Implementation Pseudocode

```ts
// tests/vitest/ui/posts-editor-chrome-wave.test.tsx (REPLACE — overwrite the committed
//   first-pass describe + its mock leftRailMode:"outline" with this re-scoped shape)
// Render the REAL PostBlockEditorShell — mock ONLY the data/seam hooks
// (usePostEditorState / usePostEditorLayout / usePostEditorPreferences /
// usePostEditorShortcuts / useFocusReturn + router / taxonomy / sonner /
// RuntimePreviewDialog). Do NOT mock PostEditorLayout / PostEditorTopBar / the
// sidebars / inspector / canvas (post-block-editor-shell-wave.test.tsx mocks those
// away — copying it yields an all-failing test; see TASK-497-02 "Regression-test
// shape" render guidance). Stub matchMedia matches:true (or force
// viewportMode="desktop") so the desktop regions mount (PostEditorLayout.tsx:76-84);
// override the editor mock's canUndo/canRedo to false for the disabled-undo case.
// Pure render/structure assertions — no model logic, no network.
//
// TEST IDIOM (repo convention — NOT @testing-library): there is NO @testing-library/react
// and NO jest-dom in this repo (tests/setup/vitest.ts registers only toBeTrue/toBeFalse/
// toBeObject), and adding them is OUT OF SCOPE (see "Out of scope" above — no runner-config
// change, no production code beyond the new test file). So: add a top-of-file
// `// @vitest-environment happy-dom` docblock (vitest defaults environment:node = no DOM);
// mountEditorShell = a createRoot + React.act mount (copy post-editor-layout-render-wave.test
// .tsx:79-103) returning { container }; the q()/textOf()/chromeButtons()/activeRailItem()
// helpers below are thin wrappers over container.querySelector(...) /
// container.querySelectorAll(...). Do NOT use screen/fireEvent/.toBeDisabled()/.toHaveAttribute
// — translate to hasAttribute("disabled")/getAttribute(...) (full translation table in
// TASK-497-02 "Regression-test shape"). The detailed assertion bodies live in TASK-497-02; the
// block below is the abbreviated structural mirror.

describe("post editor chrome restyle (TASK-497)", () => {
  it("renders an in-page PageHeader + framed card + single muted chrome bar", () => {
    const { container } = mountEditorShell(/* draft post, default prefs */);
    // Ext#2: in-page header (description) ABOVE the framed card
    expect(container.textContent).toContain("Write, format, and publish your story.");
    const frame = container.querySelector('[data-post-editor-frame="true"]');
    expect(frame?.className).toContain("rounded-2xl");
    expect(frame?.className).toContain("shadow-card");
    // single chrome bar (no secondary row)
    expect(
      container.querySelector('[data-post-editor-header-row="secondary"]')
    ).toBeNull();
    const header = container.querySelector('[data-post-editor-region="header"]');
    expect(header?.className).toContain("bg-muted/40");
    // Ext#1: LEFT rail defaults to Blocks (Outline + List relocated to sibling tabs)
    expect(
      container.querySelector('[data-post-editor-left-rail-tab="blocks"]')
    ).not.toBeNull();
    // Toggles keep their a11y contract after demotion to icon buttons.
    for (const id of [
      "post-editor-block-inserter",
      "post-editor-document-overview",
      "post-editor-details",
    ]) {
      expect(container.querySelector(`[aria-controls="${id}"]`)).not.toBeNull();
    }
  });

  it("keeps the autosave badge dynamic and the publish label status-driven", () => {
    expectSyncBadgeReaches(["Saving...", "Unsaved changes", "Saved at", "Synced"]);
    expect(publishButton(draft).textContent).toContain("Publish");
    expect(publishButton(published).textContent).toContain("Update");
  });

  it("disables undo/redo when history is empty", () => {
    const { undo, redo } = chromeButtons(mountEditorShell(/* fresh */)); // querySelector'd nodes
    expect(undo?.hasAttribute("disabled")).toBe(true);  // NOT jest-dom .toBeDisabled()
    expect(redo?.hasAttribute("disabled")).toBe(true);
  });

  it("defaults to a Blocks rail with Outline + List sibling tabs (all three coexist)", () => {
    // Re-scoped (Ext#1): ONE always-open rail, forceMount tabs, DEFAULT = Blocks. The old
    // "inserter XOR list-view / co-assert would be unsatisfiable" note is GONE — all three
    // tabs render together, so co-assert them.
    const region = q('[data-post-editor-region="secondary-sidebar"]');
    expect(region.className).toContain("bg-muted/20");
    expect(q('[data-post-editor-left-rail-tab="blocks"]')).not.toBeNull();
    expect(q('[data-post-editor-left-rail-tab="outline"]')).not.toBeNull();
    expect(q('[data-post-editor-left-rail-tab="list-view"]')).not.toBeNull();
    expect(q('[data-post-editor-left-rail-mode="blocks"]')).not.toBeNull(); // Blocks is the default
    expect(q('[data-editor-rail-group]')).not.toBeNull();           // EditorRail.tsx IS consumed (AC#5)
    expect(activeRailItem().className).toContain("bg-primary-soft"); // kept <Button role="option"> className
  });

  it("flattens the inspector but keeps the Block tab + single SEO sub-card", () => {
    const sidebar = q('[data-post-editor-region="sidebar"]');
    expect(sidebar.className).toContain("bg-card");
    expect(textOf(sidebar)).toContain("Post settings");
    expect(textOf(sidebar)).toMatch(/draft/i);                 // StatusBadge text (not soft-only class)
    expect(q('[data-post-editor-details-tab-trigger="block"]')).not.toBeNull();
    // exactly one bg-muted/30 — SCOPE to the sidebar: the real canvas rich-text toolbar also
    // emits bg-muted/30 for a selected block (PostRichTextToolbar.tsx:403,456), so a
    // whole-container count is not reliably 1.
    expect(sidebar.querySelectorAll(".bg-muted\\/30").length).toBe(1);
  });

  it("guards the canvas (dotted bg + max-w-2xl frame, no fixture byline)", () => {
    const canvas = q('[data-post-editor-canvas="article"]');
    expect(scroller().className).toContain("bg-dotted");
    expect(pageFrame().className).toContain("max-w-2xl");
    expect(textOf(canvas)).not.toContain("Alex Rivera");
  });
});
```

```ts
// tests/vitest/ui/posts-table-wave.test.tsx (EXTEND — append cases)
it("renders a quiet header on a soft-shadow container with lean columns", () => {
  const view = mount(<PostsTable items={[post]} {...handlers} />);
  const wrapper = view.container.querySelector("div"); // PostsTable's own wrapper
  expect(wrapper?.className).toContain("shadow-soft");
  expect(wrapper?.className).not.toContain("shadow-card");
  const headerText = view.container.querySelector("thead")?.textContent ?? "";
  expect(headerText).toContain("Status");
  expect(headerText).toContain("Author");
  expect(headerText).toContain("Published");
  expect(headerText).not.toContain("Comments");
  // first-name author (name = "Admin User")
  expect(view.container.textContent).toContain("Admin");
  // slug subtitle preserved; title link still -> /posts/{id}
  expect(view.container.querySelector("a")?.getAttribute("href")).toBe("/posts/post-1");
});
// NOTE: the existing selection / indeterminate / PageRowActions cases stay AS-IS.
```

```ts
// tests/vitest/ui/posts-list.test.tsx (EXTEND — header copy + label)
expect(html).toContain("Write, schedule, and publish blog posts"); // new description
expect(html).toContain("New post");                                 // new button label
// existing assertions (Posts / Loading posts / Showing 1-1 of 1 posts / Previous / Next) stay.
```

```ts
// PRESENTATION-LOCK re-baselines (UPDATE existing suites; keep functional assertions).
// Full per-line spec in TASK-497-02 "PRESENTATION-LOCK suites". Summary of string swaps:
// post-document-inspector-wave.test.tsx:
//   :300  "Current category: Not assigned"  -> (category summary box dropped) assert the
//          "Category" InspectorRow label instead
//   :320  "SEO fields completed: 0/3"       -> "SEO 0/3"  (Badge)
//   :364-374  onTitleChange/onCategoryIdChange/... toHaveBeenCalled* stay GREEN (B7 keeps
//          the Post title row + every control + Danger zone)
// ui-integration/post-document-inspector.test.tsx:
//   :39 "Publishing" / :40 "Categories and tags" / :44 "Advanced" / :45 "Current category"
//        -> "Post settings" + InspectorRow "Status"/"Category" labels;  KEEP :41/:42/:43/:46
// ui-integration/post-editor-shell-restyle.test.tsx:
//   :25 "Publishing" (+ inverted comment :24) -> "Post settings";  KEEP :26/:28 + canvas card test
// ui-integration/post-editor-header-workflow.test.tsx:
//   *** MOUNT CHANGE, not just a string swap *** — see TASK-497-02 PRESENTATION-LOCK
//   (:526-544 authoritative). This suite renders PostEditorTopBar in ISOLATION
//   (renderToString(<PostEditorTopBar/>) :30). E3/E4 MOVE PostEditorActionCluster
//   (Preview / Save draft / Publish / primary-actions / saving-`disabled` / "Update" flip)
//   OUT of the TopBar into the shell-built PageHeader pageActions, and make the chrome bar's
//   left context a STATIC "Post editor" span. So RELOCATE onto a full-shell mount:
//     :32 primary-actions, :41 "Preview", :51 saving-`disabled`, :59 "Update",
//     :43 "Header workflow" (dynamic title now lives in PageHeader, not the TopBar mount).
//   DROP :34 secondary-controls. KEEP on the TopBar mount only true chrome-bar affordances:
//     :35 close, :38 "Toggle block inserter", :39 "Hide document overview", :40 "Revisions",
//     :42 "Editor settings", sync badge ("Saving...").
//   Do NOT re-point Preview/Publish to a TopBar aria-label — they are moved-out primary
//   actions, not demoted-to-icon toggles.
// ui-integration/post-editor-layout-shell.test.tsx:           drop :17 secondary-controls;
//   :19 data-post-editor-left-rail-mode="outline" -> "blocks" (Blocks is the default, E1);
//   :20 "List view" -> "List" (renamed rail-tab, E2);
//   :22 "Document Outline" -> a stable rail marker (post-editor-document-overview id / Outline tab
//        label, E2);  KEEP :15 primary-actions / :18 close / :23 "Loading post editor" / :24 "Move
//        to trash" functional assertions
// ui-integration/post-editor-writing-canvas-flow.test.tsx:
//   *** MOUNT CHANGE, not just a string swap *** — see TASK-497-02 PRESENTATION-LOCK
//   (:597-606 authoritative). Its first test renders PostEditorTopBar in ISOLATION
//   (renderToString(<PostEditorTopBar/>) :31). E3/E4 relocate PostEditorActionCluster to the
//   shell's PageHeader pageActions, so MOVE :36 "Preview" + :37 "Publish" onto a full-shell
//   mount; they are moved-out primary actions, NOT demoted-to-icon toggles with a TopBar
//   aria-label. KEEP :35 "Hide document overview" (the Outline icon toggle) on the TopBar
//   mount. KEEP the PostListViewPanel test green.
```

**Data flow:** none new — these are render/structure assertions over already-wired
components; the post block model, store, and clients are exercised only through the
existing (unchanged) suites below.

**Error handling:** the new editor wave mounts the shell with the same mocked
`usePostEditorState`/store the sibling wave tests use; no network. If the restyle
regresses a hook (`data-post-editor-*`, `aria-controls`) the assertion fails with
the missing selector named.

---

## Existing functional suites that MUST stay green — untouched

Run these **unmodified** (no weakened assertion). They cover the preserved
functionality (block model, autosave, revisions, runtime preview, layout state,
focus return, preferences, insert flow):

**Vitest (`tests/vitest/posts/`):**
- `postEditorStore.test.ts`
- `post-editor-focus-return.test.ts`
- `post-editor-preferences.test.ts`
- `post-insert-flow.test.ts`
- (`post-editor-layout-state.test.ts` is **NOT** here — it is the Extension #1 **contract-lock
  re-baseline** (default `leftRailMode` `"outline"` → `"blocks"` + a `blocks→outline→list-view`
  transition), listed under the re-baseline set below, per TASK-497-02.)

**Vitest UI editor/list waves (`tests/vitest/ui/`)** — already-shipped suites that
exercise the **behavior** of the panes the restyle touches; they must pass unchanged.
(They survive because they assert hooks/wiring, not the changed chrome strings. The
suites that DO assert changed chrome are listed separately under "Presentation-lock
suites updated" below — those are re-baselined, **not** in this untouched set, so the
old "only the files named under 497-01/02 Owning files change" wording is superseded:
the restyle also re-points the presentation strings in the suites listed there.)
- `post-editor-canvas-wave.test.tsx`, `post-details-sidebar-wave.test.tsx`,
  `post-block-inserter-wave.test.tsx` (the `ArrowDown`+`Enter` listbox insertion path is
  preserved by the className-only restyle), `posts-create-drawer-a11y.test.tsx`,
  `post-classic-editor-shell-wave.test.tsx` (classic editor — proves it still
  renders on redesign tokens, TASK-497 D5).
- **NOT untouched — moved to the re-baseline set below (they render the REAL shell/hook and
  assert the exact affordances TASK-497-02 E1/E2 change):** `post-block-editor-shell.test.tsx`
  (asserts literal `"Document Outline"` / `"List view"` / `data-post-editor-outline-insert`),
  `post-editor-layout-hook-wave.test.tsx` (hard-asserts the OLD `"outline"` default + old
  `showInserter` derivation), `post-list-view-sidebar-wave.test.tsx` (mounts `PostListViewSidebar`
  directly — the 2→3-tab restructure + Blocks tab hosting a real `BlockInserter` needs it
  reconciled/mocked), `post-block-editor-shell-wave.test.tsx` (a **TWO-anchor re-baseline — NOT a
  single line**; see TASK-497-02 "PRESENTATION-LOCK suites" :604-624): **(a)** its
  malformed-stored-layout tolerance test hard-asserts the fallback `initialLeftRailMode:"outline"`
  at :1155, which E1's E-store change flips to `"blocks"` — re-point :1155 `"outline"` → `"blocks"`;
  **(b)** because this suite mocks `showInserter:true` (:25), E2's collapse of the
  `showInserter ? <PostInserterSidebar/> : <PostListViewSidebar/>` branch
  (`PostBlockEditorShell.tsx:455-485`) stops the mocked `PostInserterSidebar` (with its
  `insert-paragraph` button) from rendering, so the `source:"sidebar"` insert assertion at :635-638
  (clicked at :620) ALSO goes RED — re-point it to the unified rail's palette insert
  (`source:"outline-plus"`, behaviorally identical in `resolvePostInsertMutation`, already covered
  by the mock's `insert-heading` assertion at :804) OR remove the `insert-paragraph` click+assert,
  and note `close-inserter` (:619) no longer renders so its `closeSecondarySidebar` coverage now
  comes solely from `close-secondary-shell` (:621). The `source:"outline-plus"` (:804) +
  toggle-outline assertions STAY green; touching ONLY :1155 leaves :635-638 RED and fails the gate).
  Also `post-editor-layout-render-wave.test.tsx` — **NOT untouched-green: a contract/presentation-lock
  re-baseline for E4's compact-width change (Fix 3)** (mirrors TASK-497-02:752-761,793-803). Its
  compact-sidebars test (`:184`, mounted with `compactSidePanels` at `:193`) hard-asserts the COMPACT
  details override `detailsRegion.className` `toContain("w-72")` at `:202` — E4 narrows that compact
  details override `w-72` → **`w-64`** (base right inspector stays `w-72`), so `:202` renders `w-64`
  and goes RED unless re-pointed: change `:202` `toContain("w-72")` → `toContain("w-64")`. **KEEP `:201`**
  (`toContain("w-56")` — the compact secondary rail is unchanged) and every other assertion green.
  (This corrects the earlier untouched-green classification of this suite.)
- Plus the genuinely **functional** `tests/vitest/ui-integration/` suites that touch the
  restyled panes but assert only wiring/hooks (verified green): `post-autosave-flow`,
  `post-editor-keyboard-a11y`, `post-editor-inserter-sidebar`,
  `post-editor-toolbar-inspector-dedup`,
  `post-editor-details-tabs`, `post-editor-settings-dialog`, `post-list-restyle` (its
  `shadow-card` is the loading card `PostsListPage.tsx:513`, untouched by A4).
- **NOT untouched — moved to the re-baseline set below:** `post-editor-smoke-regression`
  (asserts the literal `"Document Outline"` on the real page SSR — E2 relocates it; keep only the
  classic-route `not.toContain("Document Outline")`), and `post-editor-listview-outline` (its
  `"Document Outline"` / `"List view"` copy is re-pointed to the three-tab rail; the
  `data-post-editor-outline-insert` hook is kept, re-homed into the Outline tab). Both are
  re-baselined per TASK-497-02, **not** untouched-green.

**Presentation-lock suites UPDATED (re-baselined to the new look — NOT weakened):**
the existing suites that render the real header/inspector/list and assert the first-pass
chrome the restyle deliberately changes. They run under the `bun run test:vitest` closure
gate (`vitest.config.ts:13` include = `tests/vitest/**`, covering `ui-integration/`), so
they MUST be updated; re-point only the changed strings, keep every functional assertion.
Exact files + line-by-line changes are specified in TASK-497-02 "PRESENTATION-LOCK suites"
(editor) and in the "List copy re-baseline" subsection above (the
`page-post-list-wave.test.tsx` Posts-side `"New" → "New post"` relabel):
`tests/vitest/ui/post-document-inspector-wave.test.tsx`,
`tests/vitest/ui/page-post-list-wave.test.tsx`,
`tests/vitest/ui-integration/{post-document-inspector, post-editor-shell-restyle,
post-editor-header-workflow, post-editor-layout-shell, post-editor-writing-canvas-flow}.test.tsx`,
and — added by the TASK-497-02 re-scope (E1/E2 change the default/derivation + relocate the
`"Document Outline"`/`"List view"` copy) — `tests/vitest/posts/post-editor-layout-state.test.ts`
(Ext#1 default `"outline"` → `"blocks"`), `tests/vitest/ui/post-block-editor-shell.test.tsx`,
`tests/vitest/ui/post-editor-layout-hook-wave.test.tsx`,
`tests/vitest/ui/post-list-view-sidebar-wave.test.tsx` (2→3 tabs; mock `BlockInserter`),
`tests/vitest/ui/post-block-editor-shell-wave.test.tsx` (**TWO-anchor re-baseline — NOT a single
line**; see TASK-497-02 :604-624: **(a)** its malformed-storage fallback
`initialLeftRailMode:"outline"` at :1155 flips to `"blocks"`, AND **(b)** because it mocks
`showInserter:true` (:25), E2's branch collapse stops the mocked `PostInserterSidebar` rendering,
so the `source:"sidebar"` insert assertion at :635-638 (clicked :620) also breaks — re-point it to
`source:"outline-plus"` (already covered by :804) or remove it, and `close-inserter` (:619) no
longer renders so `closeSecondarySidebar` coverage comes solely from `close-secondary-shell`
(:621); the `source:"outline-plus"` at :804 and the toggle-outline assertions stay green),
`tests/vitest/ui-integration/post-editor-listview-outline.test.tsx`, and
`tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx`. Additionally,
`tests/vitest/ui/posts-editor-chrome-wave.test.tsx` is a **REPLACE** (the already-committed
file encodes the rejected first-pass look with mock `leftRailMode:"outline"` and no PageHeader/
frame assertions — overwrite it, do not append), and `tests/vitest/ui/post-editor-support-wave-2
.test.tsx` is a **verify-after-E1** (re-run; re-baseline only if the new `openInserter`/
`showInserter` derivation shifts its transition expectations).

**Bun integration (DB-backed — `tests/integration/posts/`, run explicitly):**
- `posts-revisions-flow.test.ts` (autosave + revisions + restore)
- `posts-runtime-flow.test.ts` (runtime/preview parity)

> These run against the resettable local TEST DB (**[[local-cms-db-resettable]]**).
> The restyle touches no `postsService`/runtime code, so they must pass with zero
> edits.

---

## Testing Requirements

Run after 497-01/02 land, from repo root (`/home/coder/project/Coderso`):

- `bun --cwd core lint` (ESLint `--max-warnings=0`; catches any unused import from
  the restyle, e.g. a removed `bg-muted/40` header helper or an orphaned icon
  import).
- `bun --cwd core lint:types` (the new `EditorRail.tsx` import graph + the new test
  file type-check clean).
- New + extended + re-baselined UI suites (incl. the re-scope-affected
  `post-block-editor-shell` / `post-editor-layout-hook-wave` moved out of the untouched set):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/posts-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/posts-editor-chrome-wave.test.tsx tests/vitest/ui/posts-create-drawer-a11y.test.tsx tests/vitest/ui/post-block-editor-shell.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-editor-layout-hook-wave.test.tsx tests/vitest/ui/post-editor-layout-render-wave.test.tsx tests/vitest/ui/post-details-sidebar-wave.test.tsx tests/vitest/ui/post-document-inspector-wave.test.tsx tests/vitest/ui/post-list-view-sidebar-wave.test.tsx tests/vitest/ui/post-classic-editor-shell-wave.test.tsx`
- Updated presentation-lock `ui-integration` suites (surface re-baseline failures early — incl.
  the re-scope-affected `post-editor-listview-outline` / `post-editor-smoke-regression`):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/post-document-inspector.test.tsx tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx tests/vitest/ui-integration/post-editor-header-workflow.test.tsx tests/vitest/ui-integration/post-editor-layout-shell.test.tsx tests/vitest/ui-integration/post-editor-writing-canvas-flow.test.tsx tests/vitest/ui-integration/post-editor-listview-outline.test.tsx tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx`
- Posts store/prefs suites (untouched, green) + the `post-editor-layout-state` Ext#1 re-baseline:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/posts/postEditorStore.test.ts tests/vitest/posts/post-editor-layout-state.test.ts tests/vitest/posts/post-editor-focus-return.test.ts tests/vitest/posts/post-editor-preferences.test.ts tests/vitest/posts/post-insert-flow.test.ts`
- DB-backed posts integration (untouched, green) — these suites are `bun:test`-owned and
  fall in **no** auto-glob (not in `test:bun` `package.json:26`, not under the vitest
  `tests/vitest/**` include `vitest.config.ts:13`), so this is the **sole** place they run at
  closure; prefix with the AGENTS.md:230-232 `.env` preamble (the `package.json` scripts only
  source `.env` in their own subshell, so `DATABASE_URL` must be exported into THIS shell or the
  run fails to connect / skips), matching the form at TASK-497-02:544:
  `set -a && [ -f .env ] && . ./.env; set +a && bun test tests/integration/posts/posts-revisions-flow.test.ts tests/integration/posts/posts-runtime-flow.test.ts`
- **Full closure gates:**
  - `bun run test:vitest` — whole vitest suite green, no skips/weakening. The re-scope adds
    **no** test file: `tests/vitest/ui/posts-editor-chrome-wave.test.tsx` was already committed
    on `feature/visual` by the rejected first pass, so it is a **REPLACE** (overwrite its stale
    describe), not a new file — the test-**file** count is unchanged by this re-scope. All test
    changes are **edits to existing files**: the list assertions **extend** `posts-list.test.tsx`
    + `posts-table-wave.test.tsx` (and re-baseline the Posts-side `"New" → "New post"` lookups in
    `page-post-list-wave.test.tsx`); the **presentation-lock re-baselines** overwrite
    `posts-editor-chrome-wave.test.tsx` + `post-document-inspector-wave.test.tsx` + the five
    `tests/vitest/ui-integration/*` suites enumerated above **plus** the re-scope additions
    (`post-editor-layout-state.test.ts`, `post-block-editor-shell.test.tsx`,
    `post-editor-layout-hook-wave.test.tsx`, `post-list-view-sidebar-wave.test.tsx`,
    `post-editor-listview-outline.test.tsx`, `post-editor-smoke-regression.test.tsx`) — re-pointed
    strings, not added/removed files. Treat the absolute **case** total as the prior count **+ the
    added restyle cases** (and the re-baselined presentation assertions move, not vanish)
    — **re-baseline at implementation time**; it is **not** a fixed must-match number to
    weaken assertions toward (mirrors the TASK-496-03 close-out norm). Re-confirm the live
    baseline (both file **and** case counts) at implementation time (parallel agents drift it).
  - `bun run test:bun` — **1157/0** baseline, no posts unit regressed.
  - `bun run gates:coderso` — functional / ux / performance / security /
    reliability all **PASS** (5/5).
- **Runtime smoke** (per the redesign close-out norm, **[[local-cms-run-and-test]]**):
  start core via `coderso-dev-core-host`, open the admin at
  `http://coderso-a.localhost:5173/admin/posts` (white page = server down, re-run
  the helper) and verify with `playwright-cli`:
  - **List:** quiet table header + `shadow-soft` card, lean columns (no Comments),
    first-name author, **whole-row click navigates to the editor**, status tabs +
    `ListPaginationFooter` render, **bulk select + "New post" create drawer still
    work**.
  - **Editor:** an in-page `PageHeader` (title + description "Write, format, and publish
    your story." + Preview/Save draft/Publish) ABOVE a bordered `rounded-2xl … shadow-card`
    card; the card's single muted chrome bar ("Post editor" + autosave badge + undo/redo +
    device toggle + the six app toggles), autosave badge text updates on edit, undo/redo
    enable after an edit; the LEFT rail **defaults to Blocks** (the `EditorRail` palette) with
    **Outline + List** reachable as sibling tabs; flat "Post settings" inspector with the
    **Block tab still selectable**, dotted canvas frame, **Save draft / Publish still persist**
    (revision created) — real mouse+keyboard, not synthetic
    (**[[page-editor-color-toolbar-live-findings]]**).
  - **Classic editor (D5, out of scope):** confirm it still renders on redesign
    tokens (no regression), no restyle applied.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` (orchestrator/closure-owned — NOT one of the FIX-editable
  TASK-497 files, so re-point it here at closure, not during the FIX) — **STALE-DONE
  BOARD STATE TO CORRECT FIRST:** the rejected first pass ALREADY marked the parent
  **TASK-497** (row :167), **TASK-497-02** (:169), and **TASK-497-03** (:170) as
  **Done (2026-06-30)** with the REJECTED first-pass descriptions (row :167 "single muted
  editor chrome strip + EditorRail Blocks rail"; :169 "single muted chrome strip (2 header
  rows collapsed) … three-pane shell" with NO in-page `PageHeader`, NO framed
  `rounded-2xl … shadow-card` card, NO Blocks-DEFAULT rail). Those three rows are a
  false green (In-Progress work marked Done, encoding the dropped ~~D4~~/~~B6~~). Only
  **TASK-497-01** (:168, Done) is legitimately consistent with its file.
  **So the closure is a REVERT-THEN-RE-CLOSE, not a plain +4:**
  1. Revert rows :167/:169/:170 to **In Progress** and re-point their descriptions to the
     re-scoped deliverables (in-page `PageHeader` above a framed `rounded-2xl … shadow-card`
     card; Blocks-**default** three-tab left rail with Outline + List relocated to sibling
     tabs; flat "Post settings" inspector). Leave row :168 (497-01) as Done.
  2. Then move all four (parent + 497-01 already-Done + 497-02 + 497-03) to **Done** with a
     one-line re-scoped closure note each.
  **Statistics — recompute from the ACTUAL live board, do NOT use the stale
  "currently sit in To Do / −4/+4" premise:** the live counters already read
  `To Do: 341 / In Progress: 5 / Done: 2741` (README.md:81-83) with rows :167/:169/:170
  ALREADY in Done (2741 = 2737 + 4 = the first pass's own POST-closure target). Because
  all four rows are already counted in Done, the net Statistics delta of a correct
  re-scoped closure is **≈ 0, NOT +4** — the transient revert of the 3 mis-marked rows
  (−3 Done, +3 In Progress) is undone by re-closing them (+3 Done, −3 In Progress), and
  497-01 was already Done, so the final `To Do / In Progress / Done` counters for the
  TASK-497 rows end **unchanged** from the current live values (only the row
  *descriptions* change to the re-scoped deliverables; any counter drift you observe comes
  from OTHER tasks parallel agents closed, not from TASK-497). **Re-read the live counters at write time**
  (parallel agents drift them) and recompute against the real starting values rather than
  copying any fixed number. State the restyle preserved all posts functionality.
- `_docs/_CHANGELOG/` — add `1206-2026-06-30-task-497-posts-list-and-editor-prototype-parity-restyle.md`
  (next free number after `1205`, consumed by TASK-496; if a concurrent owner agent
  has taken `1206`, **re-confirm the next free number at write time**). Contents:
  **Tasks** = TASK-497 (01+02+03); **Type** `Admin UI / Content (Posts) / Visual
  Refresh / QA / Docs`; **Key Changes** = Posts list restyled in place (quiet
  `PostsTable` header, `shadow-soft`, lean Title/Status/Author/Published/Actions
  columns, first-name author, row-click nav; kept `PageFilters` +
  `ListPaginationFooter` + controlled bulk-selection + `PageRowActions` + create
  drawer; dropped fixture-only Comments column / category subtitle / numbered
  totals), Post editor **re-scoped to prototype parity** (owner rejected the first pass as
  "the old approach"): an in-page shared `PageHeader` (title + description "Write, format, and
  publish your story." + Preview/Save draft/Publish) ABOVE a bordered `rounded-2xl … shadow-card`
  **card**, whose top is a single muted chrome bar ("Post editor" + autosave `Badge` + undo/redo
  + device toggle + the six app toggles Add/Outline/Details/Focus/Revisions/Settings demoted to
  icon-ghost, all `data-*`/`aria-*` preserved) and whose body is a **Blocks-default** three-tab
  left `EditorRail` rail (the real `BlockInserter` palette; **Outline + List relocated to sibling
  tabs**, not dropped — Ext#1), a dotted canvas, and a flat "Post settings" inspector with the
  Block tab kept — still the editor's **own** `PostEditorLayout`/`PostEditorRegions` shell (**no**
  adoption of the Pages `CanvasEditor` shell), **no** `DataTable` swap; note the two DROPPED
  invented decisions (~~D4~~ full-viewport-no-card, ~~B6~~ Outline-default); new shared
  `core/admin/ui/shared/{EditorRail,PageHeader}.tsx` primitives consumed; classic editor out of
  scope (token-verified only); **Validation** = the gate results above; **Contract note**
  = *pure restyle — no route / RBAC / cache / preview-token / document-model change;
  no contract doc required an edit*. Add the matching Index row in
  `_docs/_CHANGELOG/README.md`.
- **No model/contract doc edits.** The post-block document contract, runtime/preview
  spec, and RBAC docs are **unchanged** — state this explicitly in the changelog
  rather than touching them. Touch `_docs/DESIGN_TOKENS.md` **only if** 497-01/02
  added a genuinely new token (they should not — the soft/violet tokens already
  ship).
- Memory: cross-link the closure to **[[admin-ui-redesign-prototype]]** and
  **[[pages-editor-v2-remediation-program]]**; note that the Posts list + editor are
  now at prototype parity (own three-pane editor shell kept, `EditorRail` shared
  primitive added) so future parity audits don't re-flag them, and record the
  deliberate **drops** (Comments column / borderless FilterBar / numbered
  Pagination / `DataTable` swap / Pages `CanvasEditor` shell) as **intentional**,
  not gaps.

---

## Acceptance Criteria (closure)

1. The **re-baselined** `tests/vitest/ui/posts-editor-chrome-wave.test.tsx` (REPLACE — its
   first-pass `leftRailMode:"outline"` describe is overwritten) and the extended
   `posts-list.test.tsx` / `posts-table-wave.test.tsx` pin the restyle: quiet table
   header on a `shadow-soft` container, lean columns (no Comments), first-name
   author, row-click nav, "New post" label + new description; an in-page `PageHeader`
   (description "Write, format, and publish your story." + Preview/Publish) ABOVE a framed
   `rounded-2xl … shadow-card` card (`data-post-editor-frame`); a single muted editor chrome
   bar, dynamic autosave badge, wired undo/redo; a **Blocks-default** three-tab left `EditorRail`
   rail (`data-post-editor-left-rail-tab="blocks"|"outline"|"list-view"`, default `blocks`) with
   Outline + List as sibling tabs; flat "Post settings" inspector with the **Block tab
   preserved**, guarded dotted canvas. The **presentation-lock suites**
   (`post-document-inspector-wave.test.tsx`, `page-post-list-wave.test.tsx` (Posts-side
   `"New" → "New post"` lookups), the five `tests/vitest/ui-integration/*` listed above, **and
   the re-scope additions** `post-editor-layout-state.test.ts`, `post-block-editor-shell.test.tsx`,
   `post-editor-layout-hook-wave.test.tsx`, `post-list-view-sidebar-wave.test.tsx`,
   `post-editor-listview-outline.test.tsx`, `post-editor-smoke-regression.test.tsx`) are
   **re-baselined** to the new chrome (changed strings re-pointed; functional assertions kept) —
   this is a restyle re-baseline, **not** an assertion weakening.
2. **Every FUNCTIONAL suite is green with no weakened assertion** —
   `tests/vitest/posts/{postEditorStore,post-editor-focus-return,post-editor-preferences,post-insert-flow}.test.ts`
   (`post-editor-layout-state.test.ts` is the Ext#1 contract-lock **re-baseline**, part of AC#1,
   not this untouched-functional set), the behavior UI waves above (NOT the re-baselined
   presentation locks of AC#1),
   `posts-create-drawer-a11y.test.tsx`, and the DB-backed
   `tests/integration/posts/{posts-revisions-flow,posts-runtime-flow}.test.ts` (run via
   `bun test`, not vitest — they are `bun:test`-owned).
3. `bun --cwd core lint` (zero unused imports), `bun --cwd core lint:types`,
   `bun run test:vitest` (re-scope adds **no** file — `posts-editor-chrome-wave.test.tsx` is a
   REPLACE of an already-committed file; re-confirm the live file/case counts at implementation
   time), `bun run test:bun` (1157/0), `bun run gates:coderso` (5/5) — all green.
4. Runtime smoke of the list + editor (and classic-editor no-regression) passes with
   **real** mouse+keyboard; bulk select, create drawer, Save draft / Publish, and
   the Block tab all still function.
5. Docs note the **pure restyle / no contract change**, changelog `1206` (or next
   free) + its README index row are added, and the board + Statistics show
   **TASK-497 and all three children `✅ Done`**.
