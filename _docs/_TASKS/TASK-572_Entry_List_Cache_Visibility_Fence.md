# TASK-572: Entry List Cache Visibility Fence

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** Medium
**Size:** Medium

# FileName: TASK-572_Entry_List_Cache_Visibility_Fence.md

**Parent Task:** none
**Source Findings:** M-517-01 + new list-cache visibility-fence finding (audits `_TMP-audit-task-517-entry-visibility.md` + frontend/cache review, verified at HEAD `4e3dab15`)

## Purpose

The public site resolves auth AFTER the shared list cache read, so an
authenticated user with `content:read` can receive the anonymous cached list
body instead of the full (private/password) list they are entitled to
(M-517-01). Additionally, a public→restricted transition must not depend on
bounded-eventual cache invalidation: a restricted entry can remain visible via
the shared list cache after it becomes private (new visibility-fence finding).
The task contract explicitly requires auth/cookies to be resolved above the
cache read.

## Evidence

- `core/server/publicSite.tsx:466-498` (cache read/return at `:493-498`) vs
  `:521-525` (`resolveEntryRequestAuth` later) and `:573-587` (list render with
  `isAuthenticated`).
- `core/server/publicEntryGateUi.tsx:136-143` — `filterVisibleEntries()` returns
  the full set when authenticated.
- Contract `TASK-517-03-Cache-Exclusion-Tests-Docs-Closure.md:63-73` — auth and
  cookies must be computed above the cache read.

## Scope

- Resolve auth before any list cache read/write. Safest model: only anonymous
  requests may read/write the shared list body cache; authenticated list renders
  bypass the shared body cache entirely (still allow lower-level DB caching).
- On a transition to restricted visibility, a gated/public boundary check must
  not rely on TTL invalidation: resolve visibility/auth first, or use a narrow
  authoritative visibility check before serving the cached list.
- Add regressions: (1) anonymous writes the list, then `content:read` user
  requests the same path and receives private/password entries without using the
  anonymous cache; (2) public→restricted transition is immediately fail-closed
  (no stale cached list exposure).

## Fix Strategy

Hoist `resolveEntryRequestAuth()` (and the gated-route signal) above the cache
read; gate cache eligibility on anonymous + ungated only. For restricted
transitions, treat the list like the gated detail path (skip shared body cache
or do an authoritative visibility recheck).

## Security Contract

- Endpoints unchanged: public site render; auth bypass requires `content:read`.
- No new payload fields; no public write surface.
- Cached values remain public-only; private/password content never enters the
  shared body cache.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest/Bun regression for the cache-ordering cases above.
- Existing entry-visibility tests stay green.

## Notes

- M-517-01 is a functional bug (wrong but not leaking list); the
  transition-fence finding is the security-relevant half.
