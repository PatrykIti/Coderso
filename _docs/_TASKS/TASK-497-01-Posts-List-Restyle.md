# TASK-497-01: Posts List Restyle
# FileName: TASK-497-01-Posts-List-Restyle.md

**Parent Task:** TASK-497
**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Posts) / List
**Estimated Effort:** Medium
**Dependencies:** None (sibling of TASK-497-02; both gated by TASK-497-03 closure). Builds on the shipped TASK-479 redesign tokens + TASK-479-09-L01 (Posts list migrated to those tokens — Done 2026-06-29).
**Status:** ✅ Done
**Completed:** 2026-06-30

---

## Overview

Bring the **Posts LIST** (`core/admin/ui/posts/PostsListPage.tsx` + `core/admin/ui/posts/PostsTable.tsx`) to prototype parity as a **restyle only** — no re-architecture, no feature change. The reference is `_docs/_PROTOTYPE/src/pages/content/PostsListPage.tsx`, which renders `PageHeader` → underline `Tabs` → borderless `FilterBar` → quiet `DataTable` → numbered `Pagination`.

The current list is already on the redesign tokens and already shares `PageHeader` / `StatusTabs` / `StatusBadge` with the prototype (TASK-479-09-L01), so most of the work is **header copy**, a **quiet table header**, a **leaner column set**, **first-name author**, and **whole-row click navigation** — restyling `PostsTable`'s look **in place**.

- **Goal:** `PostsListPage.tsx` + `PostsTable.tsx` match the prototype's *look* (quiet header, lean columns, soft shadow, first-name author, row-click) while keeping **every shipped behavior**: controlled bulk selection, `PostsCreateDrawer`, `PageRowActions` dropdown, `PageFilters`, `ListPaginationFooter`, `StatusTabs` counts, the inline bulk-action cluster, and all `postsClient` flows.
- **Owning files:** `core/admin/ui/posts/PostsListPage.tsx`, `core/admin/ui/posts/PostsTable.tsx`.
- **Prototype to port look (not data) from:** `_docs/_PROTOTYPE/src/pages/content/PostsListPage.tsx`, `_docs/_PROTOTYPE/src/components/patterns/{DataTable,FilterBar,Pagination,StatusBadge,PageHeader}.tsx`.
- **DTO source of truth:** `core/admin/services/postsClient.ts:37-51` (`PostSummary`) — drives which prototype columns are real vs fixture-only.

### Hard decisions baked into this contract (owner-approved)

1. **Keep `PostsTable` — do NOT swap to `core/admin/ui/shared/DataTable.tsx`.** The shared `DataTable` renders **uncontrolled, decorative** checkboxes (`DataTable.tsx:56` `<Checkbox aria-label="Select all" />` and `:75` `<Checkbox aria-label="Select row" />` — no `checked`/`onCheckedChange`) and has **no per-row actions slot**. The real list needs the **controlled** selection wiring (`PostsListPage.tsx:520-524`) + the `PageRowActions` dropdown (`PostsTable.tsx:182-190`). Adopt the `DataTable` **look** by restyling `PostsTable`'s classes; do not replace the component.
2. **Keep `PageFilters` + `ListPaginationFooter`** (consistency with the Pages list). The prototype's borderless `FilterBar` and numbered `Pagination` (with fixture "of 48" totals) are **deferred / fixture-only** and out of scope for this leaf.
3. **Drop fixture-only elements (parity ≠ inventing data):**
   - **Comments column** (`proto PostsListPage.tsx:66-76`) — no `comments` field on `PostSummary` (`postsClient.ts:37-51`). **Drop.**
   - **Category subtitle** under the title (`proto PostsListPage.tsx:45`) — `PostSummary` has **no resolved category** (category lives on `PostDetail.taxonomy`, `postsClient.ts:53-55`, not on the list DTO). **Keep the existing slug subtitle** (`PostsTable.tsx:144-146`).
   - **Numbered-pagination fake totals** — keep `ListPaginationFooter`.

### Out of scope (this leaf)

- The post editor (TASK-497-02), the `EditorRail` port (TASK-497-02), the borderless `FilterBar`/numbered `Pagination` swap, and any change to `postsClient`, RBAC, routes, or cache. Background: memory note **[[pages-editor-v2-remediation-program]]** (the sibling Pages restyle norms this follows).

---

## Security Contract

**UI-only restyle. No route, RBAC, cache, or endpoint changes.** This leaf changes presentation classes, header copy, the column set, and adds a whole-row click handler that reuses the **existing** `onEdit` navigation. All data flows are untouched:

- Reads keep flowing through `getCachedPosts` / `listPostsCached` / `subscribeCacheEvents` (`PostsListPage.tsx:82,121,162-166`); no mount-force change, no dirty-state change.
- Mutations keep flowing through `createPost` / `publishPost` / `unpublishPost` / `duplicatePost` / `deletePost` and the bulk `Promise.allSettled` path (`PostsListPage.tsx:367-401`) — unchanged.
- Navigation keeps using the existing `useAdminRouter().navigate` (via the `handleEdit` callback, `PostsListPage.tsx:288-290`) and `AdminLink` (`PostsTable.tsx:136-143`); the new row-click adds **no new navigation target** (it reuses `onEdit` → `/posts/{id}`).
- No new permission gates, no new fetch, no preview-token or adminPaths change.

---

## Implementation Pseudocode

### File 1 — `core/admin/ui/posts/PostsListPage.tsx`

Only the `PageHeader` props change. **Everything else stays** (bulk cluster, StatusTabs, PageFilters, PostsTable wiring, ListPaginationFooter, PostsCreateDrawer, ConfirmActionDialogs).

```tsx
// PostsListPage.tsx:431-433 — header copy (A1).
<PageHeader
  title="Posts"
  description="Write, schedule, and publish blog posts for your site." // was: "Create and publish articles rendered by widgets and templates."
  actions={
    <>
      {selectedCount > 0 ? (/* KEEP the inline bulk cluster verbatim, :436-480 */) : null}
      {/* PostsListPage.tsx:481-484 — relabel the create button, KEEP the create-drawer behavior. */}
      <Button className="gap-2" onClick={() => setCreateOpen(true)}>
        <Plus className="h-4 w-4" />
        New post {/* was: "New" */}
      </Button>
    </>
  }
/>
// NOTE (A1): do NOT switch to a bare <Link to="/posts/sample"> like proto PostsListPage.tsx:96-100.
//   The real "New" opens PostsCreateDrawer (:535-545) — preserve that.
// A2 (StatusTabs :500), A3 (PageFilters :501-511), A11 (ListPaginationFooter :533),
//   A12 (bulk cluster :436-480 + PostsCreateDrawer :535-545): NO CHANGE. Already at parity / kept by contract.
```

### File 2 — `core/admin/ui/posts/PostsTable.tsx`

This is the bulk of the leaf. Quiet header, soft shadow, lean columns, first-name author, whole-row click. The `Checkbox` / `StatusBadge` / `AdminLink` / `PageRowActions` / `Avatar` / `toInitials` wiring is preserved.

```tsx
// --- A4: container shadow-card → shadow-soft (matches DataTable.tsx:47 / prototype) ---
// PostsTable.tsx:77
<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">

// --- A5: QUIET header (mirror DataTable.tsx:52-64) ---
// PostsTable.tsx:79 — drop bg-muted/40:
<TableHeader>                                  {/* was <TableHeader className="bg-muted/40"> */}
  <TableRow className="hover:bg-transparent">  {/* keep :80 */}
    <TableHead className="w-10 pl-4"> {/* select-all checkbox cell — unchanged */}
      <Checkbox aria-label="Select all posts" checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onToggleAll?.()} />
    </TableHead>
    {/* Drop `text-xs font-semibold uppercase tracking-wider text-muted-foreground` from EVERY <TableHead>;
        use default TableHead styling like DataTable.tsx:60. */}
    <TableHead className="min-w-[12rem]">Title</TableHead>                          {/* was "Post title", :88-90 */}
    <TableHead className="hidden md:table-cell">Status</TableHead>                  {/* :91-93 */}
    <TableHead className="hidden lg:table-cell">Author</TableHead>                  {/* :94-96 */}
    <TableHead className="hidden lg:table-cell">Published</TableHead>               {/* was 2xl, :100-102 */}
    <TableHead className="w-12 pr-4 text-right">Actions</TableHead>                 {/* :106-108 */}
    {/* DROP these three <TableHead>s entirely:
        - Categories/Tags (xl), :97-99    (A6 / D3 — no category on DTO, tags are fixture-noise here)
        - Updated (2xl),          :103-105 (A6 — prototype has no Updated column)
        - (there is no Comments column to drop; it was never added — D3) */}
  </TableRow>
</TableHeader>

// --- A6: empty-row colSpan 8 → 6 (checkbox + Title + Status + Author + Published + Actions) ---
// PostsTable.tsx:114
<TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">

// --- A9: whole-row click → reuse the EXISTING onEdit navigation (/posts/{id}) ---
// PostsTable.tsx:121-122 — add cursor-pointer + onClick; KEEP the selected tint.
<TableRow
  key={post.id}
  onClick={() => onEdit(post.id)}                 // reuses handleEdit → navigate(`/posts/{id}`); no new nav target
  className={cn("cursor-pointer", isSelected && "bg-primary-soft/40")}
>
  {/* checkbox cell — stop the row click (mirror DataTable.tsx:74) */}
  <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>   {/* :123 */}
    <Checkbox aria-label={`Select ${post.title}`} checked={isSelected}
              onCheckedChange={() => onTogglePost?.(post.id)} />
  </TableCell>

  {/* Title cell — KEEP tile + AdminLink + slug subtitle (A7 / D3). */}
  <TableCell>                                                          {/* :130-156 */}
    <div className="flex items-center gap-3">
      <span className="hidden size-9 ... rounded-xl bg-muted text-muted-foreground sm:flex">
        <Newspaper className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col">
        <AdminLink href={`/posts/${encodeURIComponent(post.id)}`} prefetch
                   className="break-words text-left font-medium ... hover:underline ..."
                   aria-label={`Edit post: ${post.title}`}>
          {post.title}
        </AdminLink>
        <span className="break-all font-mono text-xs text-muted-foreground">{post.slug}</span> {/* keep slug, :144-146 */}
        {/* mobile stacked subtitle (md:hidden, currently :147-153) — RESTYLE the dropped-column info:
            keep StatusBadge + first-name author + Published date; DROP the tags chunk (renderTags removed). */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
          <StatusBadge status={post.status} />
          <span className="text-muted-foreground/60">•</span>
          <span>{authorFirst}</span>
          <span className="text-muted-foreground/60">•</span>
          <span>{formatDate(post.publishedAt)}</span>
        </div>
      </span>
    </div>
  </TableCell>

  <TableCell className="hidden md:table-cell"><StatusBadge status={post.status} /></TableCell>  {/* :157-159 */}

  {/* A8: Author cell — first name only for display; full name still feeds Avatar initials. */}
  <TableCell className="hidden lg:table-cell">                          {/* :160-171 */}
    <div className="flex items-center gap-2">
      <Avatar size="sm"><AvatarFallback>{toInitials(post.author?.name ?? post.author?.email ?? "NA")}</AvatarFallback></Avatar>
      <span className="text-sm text-muted-foreground">{authorFirst}</span>  {/* was full name :167-169, proto :57 */}
    </div>
  </TableCell>

  {/* Published — promoted from 2xl to lg (fewer columns now). */}
  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">     {/* :175-177 */}
    {formatDate(post.publishedAt)}
  </TableCell>
  {/* DROP the Categories/Tags cell (:172-174) and the Updated cell (:178-180). */}

  {/* A10: KEEP PageRowActions; stop the row click on the actions cell (mirror DataTable.tsx:74). */}
  <TableCell className="w-12 pr-4 text-right" onClick={(e) => e.stopPropagation()}>  {/* :181-191 */}
    <PageRowActions status={post.status} onEdit={() => onEdit(post.id)} ... />
  </TableCell>
</TableRow>
```

```ts
// Per-row derived author values (compute once inside items.map, near PostsTable.tsx:120):
const authorName  = post.author?.name ?? post.author?.email ?? "Unknown"; // null-safety (keeps existing "Unknown")
const authorFirst = authorName.split(" ")[0];                              // display only (proto :57)
// Avatar initials still derive from the full name with the existing "NA" fallback (toInitials("NA")→"N", :164).

// Helper cleanup:
//   - REMOVE renderTags (PostsTable.tsx:40-43) — no longer referenced once Categories/Tags + mobile-tags drop.
//   - KEEP formatDate (:18-29) and toInitials (:31-38).
//   - ADD `import { cn } from "@/lib/utils";` for the row className compose (A9) — admin convention
//     (matches DataTable.tsx:12 / StatusBadge.tsx:4). PostsTable does not import cn today.
```

**Data flow:** unchanged. `pagination.visibleRows` → `PostsTable` rows → `onEdit`/`onTogglePost`/`onToggleAll`/`PageRowActions` callbacks fire the same `PostsListPage` handlers. The row `onClick` is sugar over the existing `onEdit` path; checkbox + actions cells `stopPropagation` so selection and the dropdown menu are unaffected.

**Error handling:** none added. The list's `error` / `bulkFeedback` Alerts (`PostsListPage.tsx:488-499`) are untouched.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/posts-table-wave.test.tsx tests/vitest/ui/posts-create-drawer-a11y.test.tsx`
- The functional suites stay **green, untouched** (no behavior change here): `tests/vitest/posts/{postEditorStore,post-editor-layout-state,post-editor-focus-return,post-editor-preferences,post-insert-flow}.test.*` and `tests/integration/posts/{posts-revisions-flow,posts-runtime-flow}.test.ts`.
- Full close-out gates run in TASK-497-03 (`bun test` = vitest + `test:bun`, lint, types, `gates:coderso`, runtime-smoke via `coderso-dev-core-host` + `playwright-cli`; white page = server down → re-run helper).

---

## Regression-test shape

**`tests/vitest/ui/posts-list.test.tsx`** (`renderAdminUi(<PostsListPage />)` → serialized HTML; extend the existing tests):

- **Header copy (A1):** the cached-render HTML contains `"Write, schedule, and publish blog posts"` and the button text `"New post"`. The existing `posts-list.test.tsx:27` `toContain("New")` stays true (substring of "New post") — **add** an explicit `toContain("New post")` for precision, and **add** a `toContain("Write, schedule, and publish blog posts")` assertion (there is no existing description assertion to update). The `"New" → "New post"` relabel also breaks the **exact-match** create-button lookups in `tests/vitest/ui/page-post-list-wave.test.tsx` (Posts side: `:1364`, `:1598`, `:1716`) — those are re-pointed in TASK-497-03 "List copy re-baseline" (the Pages-side `:887` / `:1054` / `:1713` lookups stay `=== "New"` since Pages are untouched).
- **Create drawer + primitives preserved:** `StatusTabs` counts, `PageFilters` ("Search posts…"), and `ListPaginationFooter` ("Showing 1-1 of 1 posts" / "Previous" / "Next") still render — keep the existing assertions at `posts-list.test.tsx:66-68` green (no change to those primitives).

**`tests/vitest/ui/posts-table-wave.test.tsx`** (mounts `<PostsTable>` directly). The existing mocks **strip className/onClick** from `Table*` and `TableRow` (`posts-table-wave.test.tsx:14` for `TableCell`, `:27-29` for `TableHead`/`TableHeader`/`TableRow`). To assert the restyle, **extend those mocks to forward `className` and `onClick`**:

```tsx
TableHeader: ({ children, className }) => <thead className={className}>{children}</thead>,
TableHead:   ({ children, className }) => <th className={className}>{children}</th>,
TableRow:    ({ children, className, onClick }) => <tr className={className} onClick={onClick}>{children}</tr>,
TableCell:   ({ children, className, colSpan, onClick }) =>
               <td className={className} colSpan={colSpan} onClick={onClick}>{children}</td>,
```

Then assert:

- **Quiet header (A4/A5):** the outer wrapper has `shadow-soft` and **not** `shadow-card` (`container.querySelector(".shadow-soft")` truthy, `.shadow-card` falsy); `<thead>` has **no** `bg-muted/40`; no header `<th>` contains `uppercase`/`tracking-wider`.
- **Lean columns (A6/D3):** header text contains `Title` / `Status` / `Author` / `Published` / `Actions`; **absent**: `Comments`, `Categories/Tags`, `Updated`. Update the existing tag/fallback cases:
  - The "trims tags to three items" test (`posts-table-wave.test.tsx:230-283`) — the tag-text expectations no longer apply; replace them with the lean-column expectations, but **keep** its `/posts/post-1` href (`:263`) + row-action `onEdit` forwarding (`:274`) assertions.
  - The fallback test (`:189-228`) must drop `toContain("2026-03-06T12:00:00.000Z")` (`:222`, Updated column removed) and instead assert the **Published** cell renders `"—"` for `publishedAt: null`; keep `toContain("custom_status")`, `toContain("Unknown")`, `toContain("N")`.
- **First-name author (A8):** with author `{ name: "Admin User", ... }`, the author cell renders `"Admin"` and not `"Admin User"`; the `Avatar` initials still derive from the full name. Null author still renders `"Unknown"` (first token of `"Unknown"` is `"Unknown"`) — fallback test stays green.
- **Whole-row click (A9):** clicking the row `<tr>` calls `onEdit` with the post id; clicking inside the **checkbox cell** or the **actions cell** does **not** trigger `onEdit` (stopPropagation), but **does** still toggle selection / fire the row action. The row has `cursor-pointer`.
- **Selection / bulk preserved:** the existing selection tests ("controls header and row selection state", "exposes indeterminate header state" `:332`) stay green — `Select all posts` + `Select {title}` checkboxes are controlled (`checked` / indeterminate) and fire `onToggleAll` / `onTogglePost`. Keep `posts-create-drawer-a11y.test.tsx` green (inline bulk cluster + drawer untouched).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- A `_docs/_CHANGELOG/` entry is added on the parent's closure (TASK-497-03); a pure visual restyle needs **no** contract-doc edits — state so explicitly if a changelog notes it.
- No `_docs/PAGE_MODEL.md` / `_docs/PREVIEW_SPEC.md` change (list restyle only).
