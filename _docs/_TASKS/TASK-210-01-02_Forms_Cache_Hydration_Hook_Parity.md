# TASK-210-01-02: Forms Cache Hydration Hook Parity
# FileName: TASK-210-01-02_Forms_Cache_Hydration_Hook_Parity.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Admin Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-210-01-01
**Status:** To Do

---

## Overview

Align `useForms` with the Pages mount policy: hydrate valid cached rows
immediately, background-refresh when cache exists, and foreground-load only
when the cache is absent.

This leaf must preserve the existing Forms cache client contract and cache bus
keys.

## Sub-Tasks

- [ ] Export a small Forms mount option helper if it keeps tests deterministic.
- [ ] Avoid repeated `getCachedForms()` calls during initial state setup.
- [ ] Support `refresh({ force, background })` or an equivalent typed shape
  instead of a boolean-only force argument.
- [ ] Use `resolveCacheRefreshBackground` if it fits the same Pages behavior.
- [ ] Keep cache bus subscription on `cacheKeys.formsList`.
- [ ] Preserve the `options.skip` behavior used by Forms editor or tests.

## Files to Change

- `core/admin/ui/forms/hooks/useForms.ts`
- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/services/formsClient.ts` only if a missing cache helper is found.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/admin/formsClient.test.ts` only if client behavior changes.

## Security Contract

- Visibility: internal admin UI read/list behavior.
- Auth model: unchanged authenticated admin read path.
- RBAC: existing `forms:read`.
- CSRF: no writes in this leaf.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public route or write path is added.

## Pseudocode

```ts
export function resolveFormsListMountRefreshOptions(hasInitialCache: boolean) {
  return {
    force: !hasInitialCache,
    background: hasInitialCache,
  };
}
```

## Testing Requirements

- Prove cached rows render without a foreground loading card.
- Prove cache-missing entry renders the foreground loading state.
- Prove cache bus events trigger a background forced refresh.
- Prove failed background refresh keeps existing rows and surfaces inline error.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Warm Forms cache prevents foreground loading on route entry.
2. Missing Forms cache still loads from the network in the foreground.
3. `forms:list` cache events refresh without dirty-state overwrites.
4. No new mount-force refetch loop is introduced.
