# TASK-497-03: Posts Tests, Docs & Closure
# FileName: TASK-497-03-Posts-Tests-Docs-Closure.md

**Parent Task:** TASK-497
**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Posts) / QA / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-497-01 (Posts list restyle), TASK-497-02 (Post editor restyle + `EditorRail` port), TASK-479 (redesign tokens shipped), TASK-479-09 (Posts screen migrated to redesign tokens — Done 2026-06-29), TASK-496 (shared editor-chrome precedent — Done, changelog 1205)
**Status:** ✅ Done
**Completed:** 2026-06-30

---

## Overview

Closure leaf for **TASK-497**. After 497-01 restyles the Posts **list**
(`PostsListPage.tsx` + `PostsTable.tsx` in place — quiet header, `shadow-soft`,
lean columns, first-name author, row-click nav, copy/label parity) and 497-02
restyles the Post **editor** (single muted chrome strip, autosave badge,
undo/redo, optional device toggle, left `EditorRail` rail surface, flat "Post
settings" inspector) **without re-architecting** either surface, this leaf:

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
  container is `shadow-soft`), the editor renders a single muted chrome strip with
  the rail + flat inspector, and **all** preserved-functionality suites are green
  with no weakened assertions.
- **Owning files touched (tests + docs only):**
  - **New:** `tests/vitest/ui/posts-editor-chrome-wave.test.tsx`.
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

### Editor — new `tests/vitest/ui/posts-editor-chrome-wave.test.tsx`

Render the block-editor shell the same way the existing editor wave tests do
(`post-block-editor-shell-wave.test.tsx` / `post-editor-layout-render-wave.test.tsx`
are the render pattern to copy — same mocks for `usePostEditorState`/store). Pin:

- **Single muted chrome strip (B1):** assert the secondary toolbar row
  `data-post-editor-header-row="secondary"` (`PostEditorHeader.tsx:133`) is **gone /
  merged** into one strip, and the header region surface
  (`PostEditorRegions.tsx:12`, currently `border-b bg-background/95 backdrop-blur`)
  reads the muted chrome token (`bg-muted/40`). The primary row (`:84`,
  `data-post-editor-header-row="primary"`) survives.
- **Toggles preserved as a11y controls (B1):** the Add block / Outline / Details /
  Focus / Revisions controls keep their `aria-pressed` + `aria-controls`
  (`post-editor-block-inserter` `:148`, `post-editor-document-overview` `:166`,
  `post-editor-details` `:183`) even after being demoted to icon buttons — assert
  each is present and toggleable (guards `usePostEditorShortcuts`).
- **Autosave badge states (B2):** the sync presentation (`PostEditorActionCluster.tsx`,
  `data-post-editor-sync-state="true"` `:46`) still reaches all dynamic strings —
  `"Saving..."` (`:31`), `"Unsaved changes"` (`:33`), `"Saved at …"` (`:35`),
  `"Synced"` (`:36`) — restyled from the `rounded-full … bg-muted/40` pill (`:45`)
  to a `Badge`; assert the text is **dynamic, not hardcoded**.
- **Actions wired (B3/B4):** Preview (`Eye`, `:59`) present; Publish flips
  `"Publish"`→`"Update"` when `status === "published"` (`:70`) with its `aria-label`
  (`:67`) intact; optional Save draft present and wired; **undo/redo** buttons
  present and **disabled when `canUndo`/`canRedo` are false** (the store exposes
  both — `usePostEditorState.ts:302-303`, derived `:1051-1052`).
- **Left rail surface + EditorRail consumption (B6/B9):** the secondary-sidebar region
  (`PostEditorRegions.tsx:55`, currently `border-r bg-background`) reads
  `bg-muted/20`; with the **inserter OPEN** (`layout.showInserter === true`) the inserter
  sections are wrapped in the ported `EditorRailGroup`
  (assert a `[data-editor-rail-group]` element is present — this is the AC#5
  consumption point that keeps `core/admin/ui/shared/EditorRail.tsx` from shipping as a
  dead module), and each kept `<Button role="option">` row carries the rail active class
  `bg-primary-soft text-primary-soft-foreground` via `className` (NOT a literal
  `EditorRailItem` element — B6 preserves the listbox a11y). **Mutually exclusive —**
  `PostBlockEditorShell.tsx:454` renders the secondary slot as
  `layout.showInserter ? <PostInserterSidebar/> : <PostListViewSidebar/>`, so the inserter
  (the `[data-editor-rail-group]` host) and the Outline + List-view tabs
  (`data-post-editor-left-rail-tab`, `PostListViewSidebar.tsx:120,123`) can **never** coexist
  in one render. Do **not** co-assert the outline tab in the rail-group render — the
  preserved Outline + List-view tabs are already guarded by the untouched
  `post-editor-listview-outline` / `post-list-view-sidebar-wave` suites and the default-render
  `post-editor-layout-shell.test.tsx` (`left-rail-mode="outline"` / "List view" /
  "Document Outline", :18-21).
- **Right inspector (B7/B10):** the sidebar region (`PostEditorRegions.tsx:72`,
  currently `border-l bg-background`) reads `bg-card`; the Post tab shows a flat
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
// tests/vitest/ui/posts-editor-chrome-wave.test.tsx (NEW)
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
  it("renders a single muted chrome strip (secondary toolbar row merged)", () => {
    const { container } = mountEditorShell(/* draft post, default prefs */);
    expect(
      container.querySelector('[data-post-editor-header-row="secondary"]')
    ).toBeNull();
    const header = container.querySelector('[data-post-editor-region="header"]');
    expect(header?.className).toContain("bg-muted/40");
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

  it("restyles the left rail surface + EditorRail consumption (inserter open)", () => {
    // Render with layout.showInserter:true so the inserter (the [data-editor-rail-group]
    // host) mounts. PostBlockEditorShell.tsx:454 renders inserter XOR list-view, so the
    // Outline/List-view tabs are NOT present in this render — they are covered by the
    // untouched post-editor-listview-outline / post-list-view-sidebar-wave /
    // post-editor-layout-shell suites, NOT co-asserted here (would be unsatisfiable).
    const region = q('[data-post-editor-region="secondary-sidebar"]');
    expect(region.className).toContain("bg-muted/20");
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
//   drop :33 secondary-controls; :35 "Add block"/:36 "Outline" -> aria-label/title equivalents
// ui-integration/post-editor-layout-shell.test.tsx:           drop :16 secondary-controls
// ui-integration/post-editor-writing-canvas-flow.test.tsx:    :33 "Outline" -> aria-label/title
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
- `post-editor-layout-state.test.ts`
- `post-editor-focus-return.test.ts`
- `post-editor-preferences.test.ts`
- `post-insert-flow.test.ts`

**Vitest UI editor/list waves (`tests/vitest/ui/`)** — already-shipped suites that
exercise the **behavior** of the panes the restyle touches; they must pass unchanged.
(They survive because they assert hooks/wiring, not the changed chrome strings. The
suites that DO assert changed chrome are listed separately under "Presentation-lock
suites updated" below — those are re-baselined, **not** in this untouched set, so the
old "only the files named under 497-01/02 Owning files change" wording is superseded:
the restyle also re-points the presentation strings in the suites listed there.)
- `post-block-editor-shell.test.tsx`, `post-block-editor-shell-wave.test.tsx`,
  `post-editor-layout-render-wave.test.tsx`, `post-editor-layout-hook-wave.test.tsx`,
  `post-editor-canvas-wave.test.tsx`, `post-details-sidebar-wave.test.tsx`,
  `post-list-view-sidebar-wave.test.tsx`,
  `post-block-inserter-wave.test.tsx` (the `ArrowDown`+`Enter` listbox insertion path is
  preserved by the B6 className-only restyle), `posts-create-drawer-a11y.test.tsx`,
  `post-classic-editor-shell-wave.test.tsx` (classic editor — proves it still
  renders on redesign tokens, TASK-497 D5).
- Plus the genuinely **functional** `tests/vitest/ui-integration/` suites that touch the
  restyled panes but assert only wiring/hooks (verified green): `post-autosave-flow`,
  `post-editor-keyboard-a11y`, `post-editor-inserter-sidebar`,
  `post-editor-toolbar-inspector-dedup`, `post-editor-smoke-regression`,
  `post-editor-details-tabs`, `post-editor-settings-dialog`, `post-editor-listview-outline`
  (its `"Outline"` is the rail tab label, preserved), `post-list-restyle` (its
  `shadow-card` is the loading card `PostsListPage.tsx:513`, untouched by A4).

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
post-editor-header-workflow, post-editor-layout-shell, post-editor-writing-canvas-flow}.test.tsx`.

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
- New + extended UI suites:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/posts-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/posts-editor-chrome-wave.test.tsx tests/vitest/ui/posts-create-drawer-a11y.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-editor-layout-render-wave.test.tsx tests/vitest/ui/post-details-sidebar-wave.test.tsx tests/vitest/ui/post-document-inspector-wave.test.tsx tests/vitest/ui/post-list-view-sidebar-wave.test.tsx tests/vitest/ui/post-classic-editor-shell-wave.test.tsx`
- Updated presentation-lock `ui-integration` suites (surface re-baseline failures early):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/post-document-inspector.test.tsx tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx tests/vitest/ui-integration/post-editor-header-workflow.test.tsx tests/vitest/ui-integration/post-editor-layout-shell.test.tsx tests/vitest/ui-integration/post-editor-writing-canvas-flow.test.tsx`
- Posts store/layout/prefs suites (untouched, green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/posts/postEditorStore.test.ts tests/vitest/posts/post-editor-layout-state.test.ts tests/vitest/posts/post-editor-focus-return.test.ts tests/vitest/posts/post-editor-preferences.test.ts tests/vitest/posts/post-insert-flow.test.ts`
- DB-backed posts integration (untouched, green) — these suites are `bun:test`-owned and
  fall in **no** auto-glob (not in `test:bun` `package.json:26`, not under the vitest
  `tests/vitest/**` include `vitest.config.ts:13`), so this is the **sole** place they run at
  closure; prefix with the AGENTS.md:230-232 `.env` preamble (the `package.json` scripts only
  source `.env` in their own subshell, so `DATABASE_URL` must be exported into THIS shell or the
  run fails to connect / skips), matching the form at TASK-497-02:544:
  `set -a && [ -f .env ] && . ./.env; set +a && bun test tests/integration/posts/posts-revisions-flow.test.ts tests/integration/posts/posts-runtime-flow.test.ts`
- **Full closure gates:**
  - `bun run test:vitest` — whole vitest suite green, no skips/weakening. The test
    **file** count moves from the **745** baseline to **746**: exactly **+1 NEW file**
    (`tests/vitest/ui/posts-editor-chrome-wave.test.tsx`). All other test changes are
    **edits to existing files** (so they do not move the file count): the list
    assertions **extend** `posts-list.test.tsx` + `posts-table-wave.test.tsx` (and
    re-baseline the Posts-side `"New" → "New post"` lookups in `page-post-list-wave.test.tsx`),
    and the **presentation-lock re-baselines** edit `post-document-inspector-wave.test.tsx` plus
    the five `tests/vitest/ui-integration/*` suites enumerated above (re-pointed strings,
    not added/removed files). Treat the absolute **case** total as the prior count **+ the
    added restyle cases** (and the re-baselined presentation assertions move, not vanish)
    — **re-baseline at implementation time**; it is **not** a fixed must-match number to
    weaken assertions toward (mirrors the TASK-496-03 close-out norm). Re-confirm the live
    `745` baseline at implementation time (parallel agents drift it).
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
  - **Editor:** single muted chrome strip, autosave badge text updates on edit,
    undo/redo enable after an edit, left `EditorRail` "Blocks" surface, flat "Post
    settings" inspector with the **Block tab still selectable**, dotted canvas
    frame, **Save draft / Publish still persist** (revision created) — real
    mouse+keyboard, not synthetic (**[[page-editor-color-toolbar-live-findings]]**).
  - **Classic editor (D5, out of scope):** confirm it still renders on redesign
    tokens (no regression), no restyle applied.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — move **TASK-497** and its three children (497-01 /
  497-02 / 497-03) to **Done** with a one-line closure note each; update
  **Statistics** counters by **To Do −4, Done +4** (the parent + 3 leaves, all already
  on the board so they currently sit in To Do). The live baseline is
  `To Do: 339 / In Progress: 5 / Done: 2737` (README.md:81-83) → after closure
  `To Do: 335 / In Progress: 5 / Done: 2741`. **Re-read the live counters at write time**
  — they drift as parallel agents close other tasks, so recompute the −4/+4 against the
  actual values rather than copying these numbers. State the restyle preserved all posts
  functionality.
- `_docs/_CHANGELOG/` — add `1206-2026-06-30-task-497-posts-list-and-editor-prototype-parity-restyle.md`
  (next free number after `1205`, consumed by TASK-496; if a concurrent owner agent
  has taken `1206`, **re-confirm the next free number at write time**). Contents:
  **Tasks** = TASK-497 (01+02+03); **Type** `Admin UI / Content (Posts) / Visual
  Refresh / QA / Docs`; **Key Changes** = Posts list restyled in place (quiet
  `PostsTable` header, `shadow-soft`, lean Title/Status/Author/Published/Actions
  columns, first-name author, row-click nav; kept `PageFilters` +
  `ListPaginationFooter` + controlled bulk-selection + `PageRowActions` + create
  drawer; dropped fixture-only Comments column / category subtitle / numbered
  totals), Post editor restyled on its **own** three-pane shell (single muted chrome
  strip, autosave `Badge`, undo/redo, optional device toggle, `EditorRail` "Blocks"
  rail, flat "Post settings" inspector with the Block tab kept) — **no** adoption of
  the Pages `CanvasEditor` shell, **no** `DataTable` swap; new shared
  `core/admin/ui/shared/EditorRail.tsx` primitive; classic editor out of scope
  (token-verified only); **Validation** = the gate results above; **Contract note**
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

1. The new `tests/vitest/ui/posts-editor-chrome-wave.test.tsx` and the extended
   `posts-list.test.tsx` / `posts-table-wave.test.tsx` pin the restyle: quiet table
   header on a `shadow-soft` container, lean columns (no Comments), first-name
   author, row-click nav, "New post" label + new description; single muted editor
   chrome strip, dynamic autosave badge, wired undo/redo, `EditorRail` rail surface,
   flat "Post settings" inspector with the **Block tab preserved**, guarded dotted
   canvas. The **presentation-lock suites** (`post-document-inspector-wave.test.tsx`,
   `page-post-list-wave.test.tsx` (Posts-side `"New" → "New post"` lookups), and the five
   `tests/vitest/ui-integration/*` listed above) are **re-baselined** to the
   new chrome (changed strings re-pointed; functional assertions kept) — this is a
   restyle re-baseline, **not** an assertion weakening.
2. **Every FUNCTIONAL suite is green with no weakened assertion** —
   `tests/vitest/posts/{postEditorStore,post-editor-layout-state,post-editor-focus-return,post-editor-preferences,post-insert-flow}.test.ts`,
   the behavior UI waves above (NOT the re-baselined presentation locks of AC#1),
   `posts-create-drawer-a11y.test.tsx`, and the DB-backed
   `tests/integration/posts/{posts-revisions-flow,posts-runtime-flow}.test.ts` (run via
   `bun test`, not vitest — they are `bun:test`-owned).
3. `bun --cwd core lint` (zero unused imports), `bun --cwd core lint:types`,
   `bun run test:vitest` (file count 745 → **746**, +1 new file), `bun run test:bun`
   (1157/0), `bun run gates:coderso` (5/5) — all green.
4. Runtime smoke of the list + editor (and classic-editor no-regression) passes with
   **real** mouse+keyboard; bulk select, create drawer, Save draft / Publish, and
   the Block tab all still function.
5. Docs note the **pure restyle / no contract change**, changelog `1206` (or next
   free) + its README index row are added, and the board + Statistics show
   **TASK-497 and all three children `✅ Done`**.
