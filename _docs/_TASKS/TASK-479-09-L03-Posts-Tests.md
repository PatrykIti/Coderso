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
  (rounded-2xl cards, status tabs, status badges, document canvas, the restyled
  `DocumentInspector` "Publishing"/"Featured image" sections) while the core
  behaviors (filtering, store/reducer wiring, dirty/autosave) still hold — proven
  through the real exported contracts (`filterPosts`, `postEditorReducer`), since
  the SSR snapshot does not exercise click/selection/typing interactions.
- **Owning module/service:** `tests/vitest/ui-integration/post-list-restyle.test.tsx`
  and `tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx` (new),
  exercising `core/admin/ui/posts/PostsListPage.tsx` and
  `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane), the
  prototype screens under `_docs/_PROTOTYPE/src/pages/content/`, and the existing
  `tests/vitest/ui-integration/post-*.test.tsx` suites (e.g. `post-editor-layout-shell`,
  `post-document-inspector`, `post-autosave-flow`) used as fixtures/setup
  references. Note: only `postsClient.test.ts` lives under `tests/vitest/admin/`.
- **Out of scope:** No runtime (browser) tests; no new product code (L01/L02 own
  the components). Do not move existing runtime tests into Vitest for coverage.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Use the repo's real Vitest idiom — this repo has NO `@testing-library/react`,
`jest-dom`, or `user-event`. Render through the SSR helpers the existing Posts
suites use and assert on the returned HTML STRING (`html.toContain(...)`):
`renderAdminUi` from `tests/utils/adminRouterRender` for whole pages/shells, and
`renderToString` for context-free leaf components driven by explicit props. Note
the router-context caveat: a leaf that renders `AdminLink` / consumes
`useAdminRouter` (e.g. `PostsTable`, which renders `AdminLink` + `PageRowActions`)
must ALSO go through `renderAdminUi` — a bare `renderToString(<PostsTable .../>)`
THROWS "AdminRouterContext is missing" (see `AdminRouterContext.useAdminRouter`),
whereas `renderAdminUi` supplies the `AdminRouterProvider`, exactly as
`media.test.tsx` renders the leaf `MediaDetailsDrawer`. Reserve plain
`renderToString` for genuinely context-free leaves (e.g. `PostEditorCanvas`,
`DocumentInspector`, which take no router context). There is no
`screen`/`getByRole`/`userEvent`/`toBeInTheDocument`, no injectable store, and no
`store.getState()` — `renderAdminUi` is a single SSR snapshot, so click/selection/
typing flows are NOT exercised here (they remain covered by the existing
`tests/vitest/ui-integration/post-*.test.tsx` behavioral family). Behavioral
wiring that the restyle must not sever is asserted through the REAL exported
contracts: the pure exported `filterPosts` (list) and the reducer pair
`createInitialPostEditorState` + `postEditorReducer` (editor store; the dirty flag
is `dirty`, not `isDirty`).

```tsx
// tests/vitest/ui-integration/post-list-restyle.test.tsx
import { renderAdminUi } from "../../utils/adminRouterRender";
import { PostsListPage, filterPosts } from "../../../core/admin/ui/posts/PostsListPage";
import { PostsTable } from "../../../core/admin/ui/posts/PostsTable";

// Page chrome is static (no public synchronous cache seeder exists — the page
// hydrates async via listPostsCached, which SSR does not await). So assert the
// page chrome via the page SSR snapshot, and assert row/badge rendering by
// rendering the exported PostsTable directly with seeded `items`. PostsTable
// renders AdminLink + PageRowActions, which call useAdminRouter() and THROW
// "AdminRouterContext is missing" under a bare renderToString — so it must go
// through renderAdminUi (which supplies AdminRouterProvider), the same wrapper
// media.test.tsx uses to render the leaf MediaDetailsDrawer with seeded props.
test("renders header, status tabs, and the restyled table shell", () => {
  const html = renderAdminUi(<PostsListPage />, { path: "/admin/posts" });
  expect(html).toContain("Posts"); // PageHeader title
  expect(html).toContain("New"); // create action
  // shared StatusTabs strip renders the static tab labels
  expect(html).toContain("Published");
  expect(html).toContain("Drafts");
  expect(html).toContain("Scheduled");
  // table shell adopts the prototype card tokens
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("shadow-card");
});

test("status badges render expected labels (token-driven StatusBadge)", () => {
  const noop = () => undefined;
  // renderAdminUi (NOT bare renderToString) — PostsTable renders AdminLink, which
  // needs the AdminRouterProvider that renderAdminUi supplies.
  const html = renderAdminUi(
    <PostsTable
      items={[post("scheduled", "scheduled-title")]}
      onEdit={noop}
      onPreview={noop}
      onPublish={noop}
      onUnpublish={noop}
      onDuplicate={noop}
    />
  );
  expect(html).toContain("Scheduled"); // shared StatusBadge label for scheduled
  expect(html).toContain("rounded-2xl"); // restyled wrapper (was rounded-xl)
});

test("tab selection drives statusFilter (exported filterPosts wiring)", () => {
  const items = [post("published", "published-title"), post("draft", "draft-title")];
  // the tab strip writes statusFilter; filterPosts is the real filter edge
  const drafts = filterPosts(items, "", "draft", "");
  expect(drafts.map((p) => p.title)).toEqual(["draft-title"]);
  expect(filterPosts(items, "", "all", "")).toHaveLength(2);
});

// tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx
import { renderToString } from "react-dom/server";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { PostBlockEditorShell } from "../../../core/admin/ui/posts/editor/PostBlockEditorShell";
import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";
import {
  createInitialPostEditorState,
  postEditorReducer,
} from "../../../core/admin/ui/posts/editor/postEditorStore";

test("shell renders the restyled inspector sections + Publish action", () => {
  // renderAdminUi seeds NO cached post, so usePostEditorState starts loading=true
  // and the content region renders "Loading post editor..." instead of
  // PostEditorCanvas (exactly like the existing post-editor-layout-shell.test.tsx).
  // The document-card classes therefore live BEHIND the loading gate and are
  // asserted via the direct PostEditorCanvas render below — NOT on this shell SSR
  // snapshot. Here assert only chrome that renders regardless of the loading gate:
  // the details sidebar (DocumentInspector) and the header actions.
  const html = renderAdminUi(<PostBlockEditorShell />, { path: "/admin/posts/post-1" });
  // real DocumentInspector sections render in the (ungated) details sidebar
  // (NOT an invented "Post settings" header)
  expect(html).toContain("Publishing");
  expect(html).toContain("Featured image");
  // header workflow actions still present
  expect(html).toContain("Publish");
});

test("the restyled document canvas card carries the prototype card tokens", () => {
  // PostEditorCanvas is a context-free leaf (no useAdminRouter) — render it directly
  // with explicit props via renderToString, the same idiom
  // post-editor-canvas-shared.test.tsx uses to assert canvas class tokens on the
  // SSR string. This guards the restyled "document card" wrapper without the shell's
  // loading gate.
  const html = renderToString(
    <PostEditorCanvas
      document={{
        version: 1,
        meta: {},
        blocks: [
          {
            id: "block-1",
            type: "writing-canvas",
            attrs: {},
            content: {
              version: 1,
              nodes: [{ id: "node-1", type: "paragraph", text: "<p>Intro</p>" }],
            },
          },
        ],
      }}
      title="Hello"
      onTitleChange={() => undefined}
      selectedBlockId={null}
      insertFocusToken={0}
      onSelectBlock={() => undefined}
      onUpdateBlockContent={() => undefined}
      onInsertBlock={() => undefined}
    />
  );
  // restyled document card wrapper (was max-w-[720px]; now the prototype card)
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("max-w-2xl");
  expect(html).toContain("shadow-card");
});

test("an edit marks the store dirty (real reducer contract, no severed wiring)", () => {
  const initial = createInitialPostEditorState();
  expect(initial.dirty).toBe(false);
  // any content mutation flips dirty; the restyle must keep these dispatches wired
  const next = postEditorReducer(initial, {
    type: "update_meta",
    patch: { title: "Hello" },
  });
  expect(next.dirty).toBe(true);
});
```

**Data flow:** tests seed the posts cache → SSR-render the real component →
assert the load-bearing tokens/text in the returned HTML string (`rounded-2xl`,
`max-w-2xl`, `shadow-card`, badge labels, real inspector section headers) → prove
wiring through the real exported contracts (`filterPosts` for the list filter;
`createInitialPostEditorState` + `postEditorReducer` for the editor dirty flag).

**Error handling:** keep assertions resilient — match on stable text and
load-bearing class tokens via `html.toContain(...)` rather than exact full-class
strings, so future token tweaks from TASK-479-05/06 do not falsely fail these
suites. Do NOT assert interactive/inactive states (tab-click filtering, row
selection, typing) under the SSR `renderAdminUi` snapshot — those flows stay in
the existing behavioral family.

**Regression-test shape:** the two new SSR/contract suites above PLUS a green run
of the existing `tests/vitest/ui-integration/post-*.test.tsx` behavioral family
(no edits to those files unless a selector genuinely moved; if a selector moved
due to the restyle, update the minimal query rather than the assertion intent).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/post-list-restyle.test.tsx tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx`
- Full Posts regression sweep (must stay green) — the editor suites live under
  `tests/vitest/ui-integration/`; `postsClient.test.ts` is under `tests/vitest/admin/`:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/post-editor-layout-shell.test.tsx tests/vitest/ui-integration/post-document-inspector.test.tsx tests/vitest/ui-integration/post-autosave-flow.test.tsx tests/vitest/admin/postsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-09-L03`.
- Note the two new `ui-integration` suites in any test-inventory doc that lists
  the Posts coverage, so the restyle guards are discoverable.
