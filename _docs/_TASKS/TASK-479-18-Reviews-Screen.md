# TASK-479-18: Reviews Screen Migration
# FileName: TASK-479-18-Reviews-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Reviews
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype of the Reviews moderation surface
into the REAL admin Reviews screen. This is a **visual restyle only**: the soft &
friendly (Notion-like) design language — VIOLET accent, `rounded-2xl` cards, soft
shadows, warm neutrals, light default + dark toggle — is applied to the existing
moderation surface while the real reviews data, moderation actions, cache
contract, RBAC, and `adminPaths` routing stay exactly as they are.

- **Goal:** Make the real Reviews screen look like the prototype — a derived
  **stat row** (average rating + pending/this-period counts), an **underline
  Tabs** status filter, and soft **review cards** (avatar, star rating, status
  badge, body text, Approve/Reject actions) — without changing data flow,
  moderation behavior, status set, or endpoints.
- **Owning module/service:** `core/admin/ui/reviews/**`
  (`ReviewsModerationPage.tsx`, `ReviewTable.tsx`, `hooks/useReviews.ts`),
  reusing `core/admin/ui/shared/PageHeader.tsx`, the shared pattern components
  delivered by TASK-479-06 (StatCard / StatusBadge / Tabs), and
  `core/admin/components/ui/{card,badge,button,avatar,tabs,input,textarea,alert}.tsx`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`,
  `_docs/_PROTOTYPE/README.md`, `_docs/_PROTOTYPE/src/styles/theme.css`,
  `_docs/TESTING_STRATEGY.md`. Prototype reference screen:
  `_docs/_PROTOTYPE/src/pages/advanced/ReviewsPage.tsx`.
- **Out of scope:** Any change to `reviewsClient`
  (`listReviewsCached`, `getCachedReviews`, `updateReviewStatus`, `deleteReview`),
  the cache contract (`cacheKeys.reviewsList`, `subscribeCacheEvents` background
  revalidation), the reviews RBAC (read for listing; moderate/write for status +
  delete), or the `useReviews` hook's hydrate/revalidate flow. The status set stays
  **pending / approved / rejected / spam** (plus the "all" filter) — the prototype
  shows only three; the real screen MUST keep all four. No new routes, no new
  endpoints, no fabricated metrics (stats are derived from real `items` — see L01).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The screen continues to read through
`listReviewsCached` / `getCachedReviews` and write through `updateReviewStatus`
and `deleteReview` under the existing reviews RBAC and admin CSRF; no client
cache, log, or debug payload gains new fields.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-18-L01 | Reviews Moderation Restyle | ⏳ To Do |
| TASK-479-18-L02 | Reviews Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/reviews-page.test.tsx tests/vitest/admin/reviewsClient.test.ts`
- New restyle suite added in L02 (see that leaf for the exact path), run with the
  same `NODE_ENV=test vitest run --config vitest.config.ts <suite>` form.
- All pre-existing reviews Vitest suites must stay green (the restyle must not alter
  observable hydration, moderation actions, status counts, or selection behavior).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board (move this subtask + leaves through the
  status buckets) and the Statistics block on every status change.
- On closure, add a `_docs/_CHANGELOG/` entry linking `TASK-479` and the closed
  leaf id(s).
- No contract doc changes expected (visual restyle only); if any user-visible
  label changes (e.g. tab labels), note it in the changelog entry only.
