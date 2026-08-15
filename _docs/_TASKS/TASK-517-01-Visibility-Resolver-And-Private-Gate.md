# TASK-517-01: Visibility Resolver + Private Auth-Gate on the Public Render Path

# FileName: TASK-517-01-Visibility-Resolver-And-Private-Gate.md

**Parent Task:** TASK-517
**Priority:** High
**Category:** Content / Security / Public Runtime
**Estimated Effort:** Medium
**Status:** ✅ Done
**Completed:** 2026-08-14
**Depends on:** TASK-514 (landed `content_entries.visibility` + `access_password`; public
loaders already expose `visibility` + derived `hasPassword`). Lands FIRST in 517
(01 → 02 → 03).

---

## Scope

Foundation subtask. Adds (a) a **pure resolver** that maps `(visibility, hasPassword,
isAuthenticated, hasValidUnlock)` → a gate decision, (b) a **narrow server-only** loader
`getEntryAccessPasswordHash(entryId)` that selects ONLY the hash (consumed by 517-02's
submit endpoint — introduced here so 517-02 imports it read-only, keeping single-writer of
`entryReadService.ts`), (c) the **gate insertion** into `renderEntryDetailHtml`'s GENERIC
`content_entries` branch (the ONLY branch carrying the 514 visibility model; the post
branch is NOT gated — `PostDetail`/`posts` has no visibility/access_password) + auth/cookie
threading in `handlePublicRequest`, and (d) the
**private-anon → uniform 404** fail-closed render tests, (e) the **list-branch** visibility
filter, and (f) the **public-vector** filters (search + listing blocks). The `password` gate
DECISION is computed by the resolver here (so the render path returns "prompt" vs "serve"),
but the prompt UI + unlock endpoint land in 517-02.

## Leaves

- **517-01-L01** — pure `resolveEntryVisibilityGate` resolver + Vitest unit tests.
- **517-01-L02** — narrow `getEntryAccessPasswordHash(entryId)` loader (additive; NO
  widening of `getEntry`/`getEntryBySlug`/`listEntries`).
- **517-01-L03** — gate insertion in `renderEntryDetailHtml` (generic `content_entries`
  branch only; post branch excluded) + option/auth/cookie threading in
  `handlePublicRequest` (session via `attachUserFromSession`, then PERMISSION-bounded bypass —
  `getUserPermissions` + `hasPermission(perms, "content:read")`, NOT bare `Boolean(user)`; not a
  nonexistent `isAuthenticatedAdminRequest`).
- **517-01-L04** — private-anon fail-closed uniform-404 Bun render tests (incl. a non-`content:read`
  session does NOT bypass; gated-allow cache non-write at BOTH detail exits).
- **517-01-L05** — list-branch visibility filter: drop non-`public` entries from the auto
  entry-list route (`renderEntryListHtml`/`paginateEntryListEntries`) for the anon
  (non-`content:read`) path so a `private`/`password` entry is not enumerable via the list;
  Bun list-leak test. Closes the existence-leak the detail-only gate leaves open.
- **517-01-L06** — public-vector visibility filters: drop non-`public` entries from the
  anonymous public search index (`searchIndexService.ts:152-168`) AND the static-page
  listing-block entries source (`listingSources.ts:43-74`) so a `private`/`password` entry is
  not enumerable via those anonymous surfaces; DB-backed Bun tests for both vectors. Closes
  the remaining existence-leak vectors the parent no-existence-leak invariant requires.

## Shared vocabulary (defined once here; imported read-only by 517-02/03)

```ts
export type EntryVisibility = "public" | "private" | "password";       // single-sourced at entryTypes.ts:4 (514)
export type EntryGateDecision =
  | { kind: "allow" }            // render the body
  | { kind: "not-found" }        // → renderEntryDetailHtml returns null → uniform 404
  | { kind: "prompt" };          // password entry, locked → 517-02 serves the prompt page
```

## Security Contract (restatement — route-touching)

- **Endpoint visibility:** public render path. Fail-closed: any unresolved/unknown
  `visibility` value resolves to `not-found` (most restrictive), never `allow`.
- **Private:** anonymous (no authenticated render context) → `not-found` → uniform 404
  (`new Response("Not Found", { status: 404 })`, byte-identical to the existing
  not-published 404 at `publicSite.tsx:935`). Authenticated (preview/admin) →
  BYPASSES the gate (`allow`), matching the existing `options?.preview` bypass pattern.
- **Password:** `hasValidUnlock` true → `allow`; else → `prompt` (517-02 renders the
  prompt; the body is withheld). The resolver NEVER reads the hash — only the boolean
  `hasPassword` (already on the loader projection) + the pre-verified `hasValidUnlock`.
- **No hash exposure:** `getEntryAccessPasswordHash` is server-only, selects ONLY
  `contentEntries.accessPassword`, and is invoked EXCLUSIVELY by the 517-02 submit
  endpoint — never in a render map.

## Hard Invariants (subtask)

1. The resolver is a PURE function — no DB, no `Request`, no cookies; all inputs passed in.
2. `getEntry`/`getEntryBySlug`/`listEntries` projections are UNCHANGED (no hash widening).
   These live in `core/services/content/entryReadService.ts` (re-exported by `entryService.ts`).
3. Preview/admin authenticated render bypasses the gate exactly like `options?.preview` — but
   the session bypass is PERMISSION-bounded to `content:read` holders (`getUserPermissions` +
   `hasPermission`), NOT any active session (bare `Boolean(user)` is fail-open — see L03 #6).
4. Private anon → uniform 404, byte-identical to not-published (no existence leak, never
   401/403) — enforced on the detail path, the auto entry-list path (L05 filters non-`public`
   entries out of the anon list body so a private entry is not enumerable), AND the anonymous
   public search + static-page listing-block paths (L06 filters non-`public` entries).
5. `public` entries render exactly as today (no behavior change, cache unchanged — cache
   exemption for gated entries is 517-03).

## Definition of done

Resolver + narrow loader + gate insertion + list-branch filter + public-vector filters land in
strict leaf order (L01→L06); public entries render unchanged; private-anon → 404 AND not
enumerable in the anon list, search, or listing-block surfaces; private-`content:read`-authed → renders + list-visible; password entries route to the
`prompt` decision (prompt page itself is 517-02); Bun render tests green;
`bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit` green.
