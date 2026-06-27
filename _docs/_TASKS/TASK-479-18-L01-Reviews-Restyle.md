# TASK-479-18-L01: Reviews Moderation Restyle
# FileName: TASK-479-18-L01-Reviews-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Reviews
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-18
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Reviews moderation screen to match the prototype. Port the
prototype's **stat row**, **underline status Tabs**, and soft **review cards**
(avatar + star rating + status badge + body text + Approve/Reject actions) onto
`ReviewsModerationPage.tsx` while preserving every behavior: cache-hydrated
listing, background revalidation, moderation (`updateReviewStatus`), delete
(`deleteReview`), search, status filter, and the four-status model.

- **Goal:** A Notion-like, violet-accented Reviews screen — warm canvas, a
  derived stat row, an underline Tabs filter, and white `rounded-2xl` review
  cards with soft shadows and clear Approve/Reject affordances — with zero
  behavior changes.
- **Owning module/service:** `core/admin/ui/reviews/ReviewsModerationPage.tsx`
  (+ `ReviewTable.tsx` if the table view is retained for the detail/list),
  reusing `core/admin/ui/shared/PageHeader.tsx`, the shared pattern components
  from TASK-479-06 (StatCard / StatusBadge / Tabs), and
  `core/admin/components/ui/{card,badge,button,avatar,tabs,input,textarea,alert}.tsx`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`. **Ports from:**
  `_docs/_PROTOTYPE/src/pages/advanced/ReviewsPage.tsx`
  (PageHeader + StatCard row + underline Tabs + review Card list + local `Stars`
  helper), shared primitives in `_docs/_PROTOTYPE/src/components/{ui,patterns}`,
  tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to `reviewsClient`, `cachePolicy`/`cacheKeys`,
  `cacheBus`, or the `useReviews` hook flow. No change to the status set
  (pending/approved/rejected/spam), the moderation/delete semantics, search/filter
  logic, or RBAC. No new endpoints. Do NOT fabricate metrics — the prototype's
  hard-coded "4.6 / 12 / 27 / +9.2%" numbers must become real derivations of the
  loaded `items` (see pseudocode).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Reads stay on `listReviewsCached` /
`getCachedReviews`; mutations stay on `updateReviewStatus` / `deleteReview` under
the existing reviews RBAC and admin CSRF. No new fields enter client cache, logs,
or debug payloads; author email / PII is rendered exactly as today (no new
persistence or exposure).

---

## Implementation Pseudocode

Concrete shapes — port the prototype's visual structure but bind it to the REAL
state already in `ReviewsModerationPage.tsx`. **Keep all existing hooks, effects,
handlers, `useReviews` wiring, and the cache-hydrate + background-revalidation
flow untouched**; only the returned JSX (and class names) change. Stay inside
`AdminShell activeHref={...}` — route the active href through the canonical
`adminPaths` helper if one exists for reviews; never hand-build a new href.

### 1) Derived stats (NO fabricated numbers)

```tsx
// Real state stays: items, isLoading, error, search, statusFilter, selectedId,
// actionError, counts, filtered, selected, handleModerate, handleDelete.
// Replace prototype mock stats with render-time derivations of REAL items.
// Pure useMemo (no setState-in-effect; obey ESLint 9 react-hooks rules):
const averageRating = useMemo(() => {
  if (items.length === 0) return null;            // render "—", never a fake "4.6"
  const sum = items.reduce((n, r) => n + r.rating, 0);
  return (sum / items.length).toFixed(1);
}, [items]);
// `counts` already exists (all/pending/approved/rejected/spam) — reuse it; do NOT
// invent "+9.2% this week" deltas unless a real createdAt-windowed value is
// derivable. Prefer a plain count card over a fake trend delta.
```

### 2) Page header + stat row (`ReviewsModerationPage.tsx` — JSX only)

```tsx
// PageHeader stays from @/ui/shared/PageHeader (real props). Port the prototype
// stat row using the shared StatCard from TASK-479-06 (NOT the prototype's
// @/components/patterns/StatCard import path):
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
  <StatCard label="Average rating" value={averageRating ?? "—"} icon={<Star />}
            hint={`across ${counts.all} reviews`} />
  <StatCard label="Pending"  value={counts.pending}  icon={<MessageSquare />} />
  <StatCard label="Approved" value={counts.approved} icon={<ThumbsUp />} />
</div>
// Keep the existing <Alert> error/actionError blocks exactly where they are.
```

### 3) Status filter as underline Tabs

```tsx
// KEEP the real controlled statusFilter state + onValueChange. Restyle the
// existing TabsList to the prototype underline variant, but preserve ALL five
// options (all/pending/approved/rejected/spam) with their live counts. Use the
// shared Tabs from TASK-479-06 (underline) or restyle components/ui/tabs.tsx.
<Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReviewStatusFilter)} ...>
  // items: All ({counts.all}) · Pending · Approved · Rejected · Spam
</Tabs>
// Search Input stays controlled (value=search, onChange=setSearch) — restyle to
// the soft bordered input with a leading icon; do not remove it.
```

### 4) Review cards (port the prototype card list; preserve actions)

```tsx
// Replace (or complement) the master/detail table with the prototype's soft card
// list driven by `filtered`. Keep the four-status moderation intact.
function Stars({ rating }: { rating: number }) {       // port from prototype
  return <div className="flex items-center gap-0.5">{Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={i < rating ? "size-4 fill-warning text-warning"
                                        : "size-4 text-muted-foreground/30"} />))}</div>;
}

{filtered.map((review) => (
  <Card key={review.id} className="rounded-2xl p-5 shadow-soft">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Avatar name={review.authorName} size="md" />   {/* components/ui/avatar */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{review.authorName}</span>
            <Stars rating={review.rating} />
            <StatusBadge status={review.status} />       {/* shared, TASK-479-06; keep 4 statuses */}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {review.entityType}:{review.entityId}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {review.title || review.body || "No review text"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {review.status !== "approved" && (
          <Button variant="soft" size="sm" className="gap-1.5"
                  onClick={() => handleModerate(review.id, "approved")}>
            <Check className="size-4" /> Approve
          </Button>)}
        {review.status !== "rejected" && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-destructive"
                  onClick={() => handleModerate(review.id, "rejected")}>
            <X className="size-4" /> Reject
          </Button>)}
        {/* Keep access to Spam + Delete (e.g. an overflow menu) — do NOT drop the
            existing reject/spam/pending/delete moderation paths from ReviewTable. */}
      </div>
    </div>
  </Card>
))}
// Empty/loading: render the soft dashed empty panel when filtered is empty;
// show the existing "Loading reviews..." state while isLoading.
```

**Data flow:** unchanged. `useReviews` hydrates from `getCachedReviews` (lazy
initial state) → `listReviewsCached({ force: true })` background refresh →
`subscribeCacheEvents(cacheKeys.reviewsList)` revalidation → `items` → `counts` /
`filtered` / `averageRating` (pure `useMemo`) → cards. Moderation calls
`updateReviewStatus` then `refresh(true)`; delete calls `deleteReview` then
`refresh(true)` — both already present, do not change.

**Error handling:** unchanged — keep the two `Alert variant="destructive"` blocks
for `error` (load) and `actionError` (moderation/delete). The restyle must not
swallow or relocate either surface.

**React-hooks / cache rules to honor (call out in PR):** `averageRating` and any
derived metric are `useMemo` derivations (no sync setState in effects); no
mount-force refetch added; no dirty-state overwrite of in-flight edits; nav stays
on `AdminShell` + canonical `adminPaths` — do not hand-build any href.

**Regression-test shape (delivered in L02):** stat row shows derived average +
real counts (no fabricated numbers); underline Tabs filter keeps all four statuses
+ "all" with live counts; cards render one per filtered review with author, stars,
status badge, and body precedence (`title || body`); Approve/Reject buttons call
`updateReviewStatus` with the correct status and are hidden for the current state.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/reviews-page.test.tsx tests/vitest/admin/reviewsClient.test.ts`
- The new restyle suite from L02 (`tests/vitest/ui-integration/reviews-restyle.test.tsx`).
- Manual: light + dark toggle on `/admin/advanced/reviews`; confirm stat row,
  status Tabs filtering with counts, Approve/Reject/Spam/Delete moderation, and
  search all behave as before.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-18-L01`.
- No contract-doc change expected; if a user-visible label changes (e.g. a tab
  label), note it in the changelog entry only.
