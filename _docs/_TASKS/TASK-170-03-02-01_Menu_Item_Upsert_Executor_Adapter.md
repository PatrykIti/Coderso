# TASK-170-03-02-01: Menu Item Upsert Executor Adapter
# FileName: TASK-170-03-02-01_Menu_Item_Upsert_Executor_Adapter.md

**Priority:** High  
**Category:** Core/Assistant + Menus  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-03-02  
**Status:** To Do

---

## Overview

Promote `menu.item.upsert` from contract-only to executable. The adapter should add or update one safe navigation item in an existing menu by delegating to current menu services.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
assertSafeRelativeHref(action.input.href);
const tree = await deps.listMenuItems(action.input.menuId);
const flat = flattenMenuTree(tree);
const existing = findByIdOrHref(flat, action.input.id, action.input.href);
const next = upsertItem(flat, existing, action.input);
await deps.replaceMenuItems(action.input.menuId, next);
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `tests/vitest/assistant/action-family-contracts.test.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal only through existing assistant action endpoints.
- Auth model: admin session.
- RBAC: `menus:read` for plan/dry-run, `menus:write` for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: unsafe hrefs, external URLs, duplicate item ids, and unknown fields are rejected.
- Anti-abuse: no public write endpoint.
- Idempotency: repeated execute must update/noop instead of duplicating menu items.
- Secret handling: no signed URLs, provider keys, or secret-like href/metadata in preview/result payloads.

## Testing Requirements

- Vitest:
  - strict schema accepts valid `menu.item.upsert`,
  - unsafe/external hrefs reject,
  - remaining menu structure patch stays contract-only.
- Bun:
  - dry-run create/update/noop for menu item,
  - execute delegates to `replaceMenuItems`,
  - duplicate prevention by id/href.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. `menu.item.upsert` executes through existing menu services.
2. Unsafe hrefs are rejected.
3. Re-execution does not duplicate menu items.
