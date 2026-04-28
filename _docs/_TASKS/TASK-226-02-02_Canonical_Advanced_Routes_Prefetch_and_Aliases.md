# TASK-226-02-02: Canonical Advanced Routes, Prefetch, and Aliases
# FileName: TASK-226-02-02_Canonical_Advanced_Routes_Prefetch_and_Aliases.md

**Priority:** High
**Category:** Admin Routing + Cache + Backward Compatibility
**Estimated Effort:** Large
**Dependencies:** TASK-226-02-01
**Status:** To Do

---

## Overview

Move canonical admin routes from `/admin/coderso/*` to `/admin/advanced/*`
without breaking legacy bookmarks or generated internal links. This leaf owns
route normalization, SPA route matching, AdminLink canonicalization, prefetch
warmups, cache docs, media-usage admin hrefs, and route tests.

## Sub-Tasks

- [ ] Add `/coderso/*` -> `/advanced/*` alias normalization.
- [ ] Change all canonical route helpers and registry hrefs to `/advanced/*`.
- [ ] Change SPA route table patterns to `/advanced/*`.
- [ ] Ensure `AdminLink` and `useAdminRouter().navigate()` canonicalize legacy
  aliases before active-state matching.
- [ ] Update prefetch match keys to `/advanced/*`.
- [ ] Prove legacy `/admin/coderso/*` prefetch requests hit the same cache
  warmups.
- [ ] Update route, cache, perf, and docs coverage.

## Files to Change

| File | Current line(s) | Required change |
|------|-----------------|-----------------|
| `core/admin/utils/adminPaths.ts` | 65-77 | Map legacy paths and `/coderso/*` to `/advanced/*`; keep base path support. |
| `core/admin/app/AdminApp.tsx` | 546-587 | Change route patterns to `/advanced/*`. |
| `core/admin/utils/adminPrefetch.ts` | 171-246 | Change prefetch matches to `/advanced/*`. |
| `core/services/media/mediaUsageService.ts` | 105, 131, 160 | Emit canonical Advanced admin hrefs. |
| `core/admin/ui/content-types/pathResolvers.ts` | 6-9 | Resolve content type ids from Advanced path and legacy Coderso path. |
| `tests/vitest/admin/adminPaths.test.ts` | 39-125 | Update canonical expectations and add legacy alias assertions. |
| `tests/vitest/admin/admin-router.test.ts` | 8-30 | Update canonical route tests. |
| `tests/vitest/admin/adminPrefetch.test.ts` | 80, 93, 214, 248, 304 | Update canonical paths and legacy alias warmup tests. |
| `tests/perf/admin-prefetch-budget.test.ts` | 45-63 | Update route samples. |
| `tests/perf/codersoPerformanceGate.test.ts` | 136-142 | Keep gate name if product-level, update route matrix to Advanced. |

## Security Contract

- Visibility: internal admin SPA routes.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged per matched route.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: route normalization accepts only known static
  prefixes; it must not become a generic redirect engine.
- Anti-abuse:
  - no open redirects,
  - no public route exposure,
  - no wildcard path passthrough outside the known admin namespace,
  - preserve current active href and base-path sanitization.

## Pseudocode

```ts
const aliasPrefixes = [
  { from: "/coderso", to: "/advanced" },
  { from: "/content-types", to: "/advanced/engine" },
  { from: "/entries", to: "/advanced/entries" },
  { from: "/widgets", to: "/advanced/widgets" },
];

export const resolveAdminRoutePath = (path: string) => {
  const normalized = normalizePath(path.startsWith("/") ? path : `/${path}`);
  for (const alias of aliasPrefixes) {
    if (normalized === alias.from) return alias.to;
    if (normalized.startsWith(`${alias.from}/`)) {
      return `${alias.to}${normalized.slice(alias.from.length)}`;
    }
  }
  return normalized;
};
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/admin-router.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts`
- `bun run test:vitest -- tests/vitest/ui/admin-link.test.tsx tests/vitest/contentUi/contentTypePathResolvers.test.ts`
- `bun test tests/perf/admin-prefetch-budget.test.ts tests/perf/admin-request-baseline.test.ts tests/perf/codersoPerformanceGate.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_NAVIGATION.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Canonical generated admin links use `/admin/advanced/*`.
2. Legacy `/admin/coderso/*` links still resolve to the same screens.
3. Prefetch warmups work for canonical and legacy links.
4. Active nav matching is stable across aliases.
5. Performance gate route samples use canonical Advanced paths.
