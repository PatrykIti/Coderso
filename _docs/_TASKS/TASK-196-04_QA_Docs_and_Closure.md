# TASK-196-04: QA, Docs, and Closure
# FileName: TASK-196-04_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + CMS/Menus + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-196-01, TASK-196-02, TASK-196-03
**Status:** To Do

---

## Overview

Close the `TASK-196` family with targeted validation, report replay, docs
parity, changelog, and board synchronization.

This leaf exists so Menus fixes do not stop at component patches without a
clear statement of:

- which report findings were actually covered,
- which tests own the regressions,
- which docs changed because Menus now has list + editor surfaces.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/menu-list-page.test.tsx`
- `tests/vitest/ui/menu-editor.test.tsx`
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
- `tests/vitest/ui/menu-editor-refresh-policy.test.tsx`
- `tests/vitest/ui/menu-editor-validation.test.ts`
- `tests/vitest/ui/menu-tree.test.tsx`
- `tests/vitest/ui/menu-item-row.test.tsx`
- `tests/vitest/ui/menu-item-form.test.tsx`
- `tests/vitest/ui/menu-item-delete-dialog.test.tsx`
- `tests/vitest/ui/menu-leaf-components.test.tsx`
- `tests/vitest/admin/menusClient.test.ts`
- `tests/vitest/admin/adminApp.test.tsx`
- `tests/integration/routes/menus.test.ts` only if any server contract changed
- `tests/unit/menus/menuService.test.ts` only if any service/tree contract
  changed
- `tests/perf/admin-prefetch-budget.test.ts` only if route-prefetch semantics
  changed
- `_docs/CMS_SPEC.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `docs/screens/menus.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for TASK-196

## Security Contract

- Visibility: no new endpoint surface.
- Auth/RBAC/CSRF/rate-limit: unchanged unless an earlier leaf explicitly
  changed a server contract, in which case closure must document it.
- Reject-unknown validation: unchanged unless documented otherwise by an
  earlier leaf.
- Anti-abuse:
  - closure notes must distinguish UI-only fixes from any route/service changes,
  - report replay must confirm that no native delete confirm remains.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-editor.test.tsx tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/menu-editor-refresh-policy.test.tsx tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-item-form.test.tsx tests/vitest/ui/menu-item-delete-dialog.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/admin/adminApp.test.tsx`
  - keep `tests/vitest/ui/menu-item-delete-dialog.test.tsx` as the mandatory
    real `Dialog` path for delete confirmation
  - keep at least one real tree/row path in scope for hierarchy and affordance
    regressions
  - route split closure notes must cite `adminApp` or equivalent route-owner
    proof, not only isolated component renders
  - closure notes must cite both `tests/vitest/ui/menu-leaf-components.test.tsx`
    and `tests/vitest/ui/menu-editor-shell-wave.test.tsx` for `Location`
    guidance, because create-surface and editor-surface owners differ
- Bun only if server/service code changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/menus.test.ts tests/unit/menus/menuService.test.ts`
- Perf gate only if route-prefetch semantics changed:
  - `set -a && source .env && set +a && bun test tests/perf/admin-prefetch-budget.test.ts`
- QA replay:
  - replay `_docs/PLAYWRIGHT/SUMMARY-MENUS.md`
  - confirm explicitly that BUG-3 / UX-2 were resolved by the new list-first IA
    and removal of the editor dropdown rather than by copy-only tweaks

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `docs/screens/menus.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry

## Acceptance Criteria

1. The `TASK-196` family ships with named Vitest/Bun ownership for every report
   area it changes.
2. Closure explicitly states which findings were fixed by the IA split, which by
   tree/delete work, and which by editor feedback/guidance work.
3. Cache/docs/board/changelog are synchronized with the final Menus behavior.
