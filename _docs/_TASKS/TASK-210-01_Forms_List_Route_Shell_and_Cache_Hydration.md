# TASK-210-01: Forms List Route, Shell, and Cache Hydration
# FileName: TASK-210-01_Forms_List_Route_Shell_and_Cache_Hydration.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Admin Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-210
**Status:** To Do

---

## Overview

Align the Forms list route shell and cache hydration behavior with the current
Pages list before table/actions work starts.

`/admin/coderso/forms` must be the canonical active href. `/admin/forms` remains
accepted only through the existing alias normalization in `adminPaths`. The
list should hydrate cached forms immediately, then revalidate in the background
when cache exists, matching the Pages mount policy.

## Sub-Tasks

- [ ] TASK-210-01-01: Forms Canonical Route and Prefetch Warmup
- [ ] TASK-210-01-02: Forms Cache Hydration Hook Parity
- [ ] Update `FormListPage` to use `activeHref="/admin/coderso/forms"`.
- [ ] Keep programmatic editor navigation through canonical admin routing:
  replace touched list links and navigation calls with `/coderso/forms/:id`
  literals or shared helpers so new code does not rely on the legacy
  `/forms` alias.
- [ ] Normalize route-shell-only legacy literals in `FormBuilderPage` and
  `FormActionLogsPage` where they currently use `/admin/forms`,
  `/forms/:id`, or `/forms/:id/action-runs`; do not change builder/runtime
  behavior beyond canonical navigation and active hrefs.
- [ ] Replace `useForms` force-on-mount behavior with a cache-present/background
  and cache-missing/foreground refresh policy.
- [ ] Keep `listFormsCached({ force: false })` as the prefetch warmup path.
- [ ] Preserve the existing `AdminShell`, `PageHeader`, and `max-w-6xl` shell,
  then leave visual/table parity to TASK-210-02.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx` if editor links are normalized while this
  area is touched.
- `core/admin/ui/forms/FormBuilderPage.tsx` and
  `core/admin/ui/forms/FormActionLogsPage.tsx` for canonical
  active-href/navigation cleanup only.
- `core/admin/ui/forms/hooks/useForms.ts`
- `core/admin/utils/adminPrefetch.ts` only if the current Forms warmup contract
  needs an assertion or code adjustment.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/vitest/admin/adminPaths.test.ts`

## Security Contract

- Visibility: internal admin UI list route.
- Auth/RBAC/CSRF/rate-limit: unchanged; this task only changes read/list shell
  behavior and does not add writes.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged; no public write path.

## Pseudocode

```ts
export function resolveFormsListMountRefreshOptions(hasInitialCache: boolean) {
  return {
    force: !hasInitialCache,
    background: hasInitialCache,
  };
}

const initialCached = useMemo(() => getCachedForms(), []);
const hasInitialCache = initialCached !== null;
const [items, setItems] = useState(() => initialCached ?? []);
const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
```

If a shared mount helper already exists and fits this shape, use that shared
owner instead of creating a Forms-only cache policy module.

## Testing Requirements

- Add or update Vitest coverage proving:
  - cached Forms rows render without foreground loading;
  - cache-missing mount uses foreground loading;
  - cache events refresh Forms in the background;
  - `/admin/forms` aliases to `/admin/coderso/forms`;
  - list active state and row editor links resolve to canonical
    `/admin/coderso/forms` routes;
  - builder and action-log active hrefs/navigation resolve through canonical
    `/admin/coderso/forms` routes without changing editor/runtime behavior;
  - prefetch for `/admin/coderso/forms` calls `listFormsCached({ force: false })`.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/ADMIN_NAVIGATION.md` only if route wording changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms list active href is canonical `/admin/coderso/forms`.
2. `/admin/forms` still works as a legacy alias.
3. Valid cached Forms rows render immediately.
4. Route entry does not force a foreground `GET /forms` when cache exists.
5. Prefetch remains warmup-only and uses the cached list contract.
