# TASK-486-01-L02: Published-Popup Public Resolver (DB-backed)
# FileName: TASK-486-01-L02-Published-Popup-Resolver.md

**Parent Subtask:** TASK-486-01
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Small
**Dependencies:** TASK-486-01-L01
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Implement `resolvePublicPopups({ path, isLoggedIn })` — query the
  `popups` table for `status = "published"` rows, map them through the existing
  `mapPopup` normalizers, apply `matchPopupRequest` (L01), project with
  `toPublicPopup`, and return a deterministically ordered list of `PublicPopup`.
  This is the single server-side targeting-evaluation entry point that the route
  (L03) calls.
- **Owning module(s) to create-or-extend:** add `resolvePublicPopups` to
  `core/services/popups/popupService.ts` (reuses its private `mapPopup` +
  `popups` table import) — keep the public projection in
  `popupPublicContract.ts` from L01.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md` (server-only DB access stays
  behind service modules), `_docs/CMS_API.md` (engagement section).
- **Out of scope:** HTTP/rate-limit/session (L03); pure matcher/DTO (L01).

---

## Security Contract

- **Endpoint visibility:** n/a (service function; invoked by the public route).
- **Auth model:** anonymous read — the caller (L03) passes a server-resolved
  `isLoggedIn`. The resolver itself trusts only what L03 derives from the
  session.
- **RBAC:** n/a (no permission check inside the resolver; the route is
  deliberately public-read, NOT `popups:read`).
- **CSRF:** n/a (read-only).
- **Rate-limit bucket:** n/a here (`public_read` applied in L03).
- **Validation:** input already validated by L03's `popupPublicQuerySchema`;
  resolver defensively coerces `path` to a string and `isLoggedIn` to boolean.
- **Anti-abuse:** n/a (idempotent read).
- **Secret/PII handling:** returns ONLY `toPublicPopup` output — never raw rows,
  `name`, `status`, `targeting`, or timestamps. Hard-filters `status !==
  "published"` at the query layer so drafts/archived can never surface even if
  targeting matched.

---

## Implementation Pseudocode

```ts
// core/services/popups/popupService.ts (append)
import { matchPopupRequest, toPublicPopup, type PublicPopup }
  from "./popupPublicContract";

export type PublicPopupRequest = { path: string; isLoggedIn: boolean };

export async function resolvePublicPopups(
  req: PublicPopupRequest
): Promise<PublicPopup[]> {
  const path = typeof req.path === "string" ? req.path : "/";
  const isLoggedIn = Boolean(req.isLoggedIn);

  const rows = await db
    .select()
    .from(popups)
    .where(eq(popups.status, "published"))     // uses popups_status_idx
    .orderBy(desc(popups.updatedAt))
    .limit(200);                               // hard cap, mirrors listPopups

  return rows
    .map(mapPopup)                             // existing normalizer
    .filter((p) => matchPopupRequest(p, { path, isLoggedIn }))
    .map(toPublicPopup);
}
```

**Data flow:** `eq(status,"published")` query (indexed) → `mapPopup` normalize →
`matchPopupRequest` server-side targeting → `toPublicPopup` PII projection →
ordered array. No mutation, no caching here (caching is at the HTTP/site layer).

**Error handling:** DB/normalizer errors propagate to L03's `try/catch`, which
maps them with `mapPopupError`. A malformed stored row that fails a `normalize*`
call surfaces as a `popup_*` domain error (already handled by `mapPopupError`).

**No DB migration:** read-only against the existing `popups` table + existing
`popups_status_idx` (`core/db/tables/engagement.ts:19,37`, re-exported by `core/db/schema.ts`). **No SQL file, no
`meta/*_snapshot.json`, no `meta/_journal.json` required.**

**Regression-test shape (Bun, DB-backed):**

- Seed published + draft + archived popups; assert only published are returned.
- Seed include/exclude/audience variants; assert server-side targeting filters.
- Assert returned objects are `PublicPopup` (no `status`/`targeting`/`name`).

---

## Testing Requirements

- **Bun** (`tests/integration/routes/popups-public.test.ts` shares the harness,
  or a dedicated `tests/integration/...` DB test): exercises `resolvePublicPopups`
  against a seeded DB.
- Gates: `bun run lint`, `bun --cwd core lint:types`, `bun test`.
