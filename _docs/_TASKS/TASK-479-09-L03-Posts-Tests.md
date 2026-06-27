# TASK-479-09-L03: Posts Tests
# FileName: TASK-479-09-L03-Posts-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-479-09-L01, TASK-479-09-L02
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-09
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add Vitest render tests that lock in the Posts list restyle and the Post editor
shell restyle, and confirm the restyle did not regress any data/cache/store
behavior. These are presentation guards layered on top of the existing
behavioral `post-*` suites, not a replacement for them.

- **Goal:** New Vitest suites that render the real `PostsListPage` and the real
  Post editor shell (block mode) and assert the prototype look is present
  (rounded-2xl cards, status tabs, violet status badges, document canvas, "Post
  settings" inspector) while the core behaviors (filtering, selection/bulk
  cluster, AdminLink prefetch, store binding, dirty/autosave) still work.
- **Owning module/service:** `tests/vitest/ui-integration/post-list-restyle.test.tsx`
  and `tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx` (new),
  exercising `core/admin/ui/posts/PostsListPage.tsx` and
  `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane), the
  prototype screens under `_docs/_PROTOTYPE/src/pages/content/`, and the existing
  `tests/vitest/admin/post-*.test.tsx` suites used as fixtures/setup references.
- **Out of scope:** No runtime (browser) tests; no new product code (L01/L02 own
  the components). Do not move existing runtime tests into Vitest for coverage.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Mirror the setup of the existing Posts suites (mock `postsClient`/`cachePolicy`/
`settingsClient`, seed `getCachedPosts`, wrap in the `AdminRouter`/shell test
providers already used by `tests/vitest/admin/post-*.test.tsx`). Assert on
stable, semantic signals — accessible roles/text and load-bearing class tokens —
not brittle full-class snapshots.

```tsx
// tests/vitest/ui-integration/post-list-restyle.test.tsx
describe("Posts list restyle", () => {
  it("renders header, status tabs, and a rounded-2xl table", async () => {
    seedCachedPosts([post("published"), post("draft"), post("scheduled")]);
    renderPostsListPage();
    expect(screen.getByRole("heading", { name: "Posts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
    // status tabs with derived counts
    const all = screen.getByRole("tab", { name: /all/i }); // or button if not role=tab
    expect(all).toBeInTheDocument();
    // table wrapper adopts the prototype card tokens
    const table = screen.getByRole("table");
    expect(table.closest("[class*='rounded-2xl']")).toBeTruthy();
  });

  it("tab click drives statusFilter without breaking the list", async () => {
    seedCachedPosts([post("published"), post("draft")]);
    renderPostsListPage();
    await userEvent.click(screen.getByRole("tab", { name: /drafts/i }));
    // only draft rows visible; behavior preserved (filterPosts path)
    expect(screen.queryByText(/published-title/i)).not.toBeInTheDocument();
  });

  it("status badges render expected labels (token-driven StatusBadge)", () => {
    seedCachedPosts([post("scheduled")]);
    renderPostsListPage();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("selecting rows still surfaces the bulk-action cluster", async () => {
    seedCachedPosts([post("published")]);
    renderPostsListPage();
    await userEvent.click(screen.getByRole("checkbox", { name: /select .*post/i }));
    expect(screen.getByText(/post.* selected/i)).toBeInTheDocument();
  });
});

// tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx
describe("Post editor shell restyle", () => {
  it("renders the document canvas card + Post settings inspector", () => {
    renderPostBlockEditorShell(seededStore());
    const canvas = screen.getByRole("article"); // restyled document card
    expect(canvas.className).toMatch(/rounded-2xl/);
    expect(canvas.className).toMatch(/max-w-2xl/);
    expect(screen.getByText(/post settings/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
  });

  it("inspector status control stays bound to the store", async () => {
    const store = seededStore();
    renderPostBlockEditorShell(store);
    // changing the status Select dispatches the real store action (no severed wiring)
    await userEvent.selectOptions(screen.getByLabelText(/status/i), "published");
    expect(store.getState().document.status).toBe("published");
  });

  it("editing a block still flips the dirty/autosave indicator", async () => {
    const store = seededStore();
    renderPostBlockEditorShell(store);
    await typeIntoFirstBlock("hello");
    expect(store.getState().isDirty).toBe(true);
  });
});
```

**Data flow:** tests seed cache/store → render the real component → assert
DOM/role/text + load-bearing tokens (`rounded-2xl`, `max-w-2xl`, badge labels) →
drive one behavioral path per area (tab→filter, select→bulk, select→store action,
type→dirty) to prove the restyle preserved wiring.

**Error handling:** keep assertions resilient — query by accessible role/name and
`toMatch`/`class*=` token checks instead of exact className strings, so future
token tweaks from TASK-479-05/06 do not falsely fail these suites.

**Regression-test shape:** the two new suites above PLUS a green run of the
existing `post-*` behavioral family (no edits to those files unless a selector
genuinely moved; if a selector moved due to the restyle, update the minimal
query rather than the assertion intent).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/post-list-restyle.test.tsx tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx`
- Full Posts regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/post-editor-layout-shell.test.tsx tests/vitest/admin/post-document-inspector.test.tsx tests/vitest/admin/post-autosave-flow.test.tsx tests/vitest/admin/postsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-09-L03`.
- Note the two new `ui-integration` suites in any test-inventory doc that lists
  the Posts coverage, so the restyle guards are discoverable.
