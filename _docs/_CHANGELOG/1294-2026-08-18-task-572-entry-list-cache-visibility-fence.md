# 1294 - TASK-572 Entry List Cache Visibility Fence

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-572

## Key Changes

### Public Rendering / Caching
- `resolveEntryRequestAuth()` is hoisted ABOVE the list shared-cache read in
  `publicSite.tsx` so the gated-route signal is authoritative before any
  cached body is served.
- The list body cache read/write is now gated on
  `!isAuthenticated && !routeIsGatedEntry`: authenticated list renders bypass
  the shared body cache entirely (lower-level DB caching may stay), and
  restricted/gated entry lists never read or populate the shared body cache.
- Restricted transitions (public -> private/password/unpublished) treat the
  list like the gated detail path: narrow authoritative visibility recheck
  before serving a cached list, never TTL-based invalidation (fail-closed).

## Validation
- `bun --cwd core lint` + `lint:types` green; Bun runtime regressions for the
  cache-ordering cases: (1) anonymous primes the list, then a `content:read`
  session requests the same path and receives private/password entries
  without the anonymous cache; (2) public->restricted transition is
  immediately fail-closed (no stale cached list exposure); (3)
  anonymous-prime -> authed-read ordering. Existing
  `tests/integration/runtime/entry-visibility-gate.test.ts` stays green.
- Runtime smoke: covered by the entry-visibility suite
  (`wf579-517smoke`, 6 scenarios: anon cached render, private uniform 404,
  password unlock cycle, cross-entry isolation, no shared-cache leak, publish
  parity).
