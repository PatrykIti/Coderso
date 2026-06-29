# TASK-479-09-L01: Posts List Restyle
# FileName: TASK-479-09-L01-Posts-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-09
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Restyle the real Posts **list** screen to match the prototype: redesigned
`PageHeader`, a status **tab** strip, the soft `FilterBar`, a `rounded-2xl`
`DataTable` with violet status badges, and the soft pagination footer. All data,
filtering, selection, bulk actions, and caching stay byte-for-byte the same.

- **Goal:** `core/admin/ui/posts/PostsListPage.tsx` + `PostsTable.tsx` (and the
  shared `PostsCreateDrawer`) look like
  `_docs/_PROTOTYPE/src/pages/content/PostsListPage.tsx` while preserving the
  existing list logic and cache contract.
- **Owning module/service:** `core/admin/ui/posts/PostsListPage.tsx`,
  `core/admin/ui/posts/PostsTable.tsx`, `core/admin/ui/posts/PostsCreateDrawer.tsx`,
  and the shared `core/admin/ui/pages/PageFilters.tsx` (reused by Posts).
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/content/PostsListPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,FilterBar,DataTable,StatusBadge,Pagination}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `postsClient`, `cachePolicy`/`cacheKeys`,
  `cacheBus`, `useListPagination`, `listActionToasts`, RBAC, or the create/preview/
  publish/delete flows. Bulk-action semantics and the confirm dialogs are unchanged.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `PostsListPage.tsx` (the
`useMemo(getCachedPosts)` lazy init, the `listPostsCached` hydrate effect, the
`subscribeCacheEvents(cacheKeys.postsList)` background revalidation, the
`hasHydratedRef` no-mount-force-refetch guard, `useListPagination`,
`filterPosts`). Keep the render-tree behavior identical; swap classNames and add
the tab strip.

```tsx
// PostsListPage.tsx — RENDER ONLY changes inside the existing return().
// 1) PageHeader: keep title/description/actions props; PageHeader itself is
//    restyled centrally by TASK-479-06 so this file just keeps passing the same
//    props. Selected-count bulk cluster + "New" button keep their handlers.
<PageHeader
  title="Posts"
  description="Create and publish articles rendered by widgets and templates."
  actions={/* UNCHANGED: bulk Select/Apply/Clear cluster + New button */}
/>

// 2) NEW status tab strip — use the shared `StatusTabs` from 479-06-L02 (Tabs
//    `line` variant from 479-05/06; the prototype's `underline` variant is named
//    `line` in core — do NOT invent a divergent tab primitive here).
//    DERIVE counts from already-loaded `items` (render-time derivation — NO new
//    effect, NO sync setState). The tab simply sets the existing statusFilter.
//    Only enumerate real `PostStatus` members ("draft" | "published" |
//    "scheduled" | "archived"); never an invented "review"/"trash".
const statusTabs = useMemo(() => {
  const by = (s: string) => items.filter((p) => p.status === s).length;
  return [
    { value: "all", label: "All", count: items.length },
    { value: "published", label: "Published", count: by("published") },
    { value: "draft", label: "Drafts", count: by("draft") },
    { value: "scheduled", label: "Scheduled", count: by("scheduled") },
  ];
}, [items]);
// Render the shared `StatusTabs` (line variant: violet active text + bottom
// border, muted count pill) that calls setStatusFilter(tab.value);
// active = statusFilter === tab.value. Keep it a thin presentational addition
// layered over the EXISTING statusFilter state so PageFilters' status Select and
// the tabs stay in sync (both write statusFilter).

// 3) FilterBar look: PageFilters.tsx is the shared filter component. Restyle its
//    container to the prototype FilterBar (rounded-2xl card, soft border, search
//    input with leading icon, right-aligned controls). Keep ALL props/handlers
//    (search/status/author + onChange callbacks). Since PageFilters is shared
//    with Pages, restyle it in place — the class swap benefits both screens.

// 4) DataTable / PostsTable.tsx: keep columns, selection checkboxes, AdminLink
//    title cell (prefetch), PageRowActions menu. Restyle the wrapper + rows:
//      - container: "overflow-hidden rounded-2xl border bg-card shadow-card"
//        (was rounded-xl ... shadow-sm) to match prototype DataTable.
//      - header row: soft muted bg, xs uppercase tracked labels (already close).
//      - row hover: "hover:bg-accent/40" soft violet-tinted hover.
//      - title cell: optional leading rounded-xl icon tile (Newspaper) like the
//        prototype, kept decorative; AdminLink href + prefetch UNCHANGED.

// 5) Status badges: replace the local statusStyles/ statusLabels hex maps in
//    PostsTable.tsx with the shared `StatusBadge` from 479-06-L02 (token-driven,
//    not a per-screen re-port), so the colors read from the theme instead of
//    hard-coded Tailwind color utilities. Bind ONLY the real `PostStatus`
//    members ("draft" | "published" | "scheduled" | "archived" — there is no
//    "review" on the posts DTO; drop it). The shared StatusBadge maps these as:
//    published→success, draft→secondary, scheduled→info, archived→secondary
//    (matching the prototype StatusBadge — note scheduled is `info`, NOT
//    `warning`). Same label text ("Published"/"Draft"/"Scheduled"/"Archived").
```

**Data flow:** `getCachedPosts()` lazy init → `listPostsCached` hydrate +
`cacheBus` background revalidation → `filterPosts(items, query, status, author)` →
`useListPagination` → `PostsTable` rows → `ListPaginationFooter`. The restyle
changes none of these edges; the new tab strip only writes the existing
`statusFilter` state.

**Navigation/href constraint (preserve):** Row title links and the New/edit/
duplicate navigations must keep routing through the canonical helpers — keep
`AdminLink href={...} prefetch` for the title cell and the existing
`navigate("/posts/<id>")` calls. Do NOT hand-build `<a href>` or string-concat
admin URLs; if a value is currently produced via `adminPaths`/`AdminLink`/
`prefetchAdminRoute`, leave that wiring intact.

**Error handling:** The destructive/destructive-alike `Alert` blocks (`Posts API
error`, bulk feedback) and the two `ConfirmActionDialog`s keep their existing
copy and conditions; only their surrounding card styling inherits the new tokens.
No new error surfaces.

**React-hooks/cache rules:** Tab counts are derived at render via `useMemo` over
`items` — no effect, no synchronous `setState` in an effect. Do not add any mount
effect that force-refetches; the existing single hydrate effect + cacheBus
subscription are the only data effects and must be left untouched (no dirty-state
overwrite, no refetch loop).

**Regression-test shape:** see L03 — render PostsListPage with a seeded
`getCachedPosts` via the SSR `renderAdminUi` helper and assert on the returned
HTML string: header + New button present, the status tab strip renders with
counts derived from items, the table wrapper carries the rounded-2xl/card classes,
and status badges render expected label text. The tab→statusFilter wiring is
asserted at the function level through the exported `filterPosts` (pure), since
`renderAdminUi` is a single SSR snapshot and does not exercise click/selection
interactions — those bulk/selection flows stay covered by the existing
`tests/vitest/ui-integration/post-*.test.tsx` behavioral family.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/post-list-restyle.test.tsx`
  (new suite in L03)
- Re-run the existing list-adjacent suites to confirm no behavioral regression,
  e.g. `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/postsClient.test.ts`
  plus any Pages/Posts filter suites touching `PageFilters`.
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-09-L01`.
- If `PageFilters.tsx` or a shared `StatusBadge` helper is introduced/changed,
  note it alongside the TASK-479-06 shell notes so Pages/Users lists reuse the
  same restyled primitives.
