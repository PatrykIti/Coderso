# TASK-211-02-01: Admin Action Toast Adapter for Editor Mutations
# FileName: TASK-211-02-01_Admin_Action_Toast_Adapter_for_Editor_Mutations.md

**Priority:** High
**Category:** Admin/UI + Notifications
**Estimated Effort:** Small
**Dependencies:** TASK-211-02, TASK-208-01
**Status:** To Do

---

## Overview

Provide a shared adapter seam for non-list admin mutation toasts so Page editor
save/publish feedback can use the central notification system without adding
raw component-local Sonner calls.

The current `createListActionToastAdapter` is intentionally list-shaped and
owns bulk/list copy. Page editor needs the same central host and error
normalization, but not list labels or bulk math. This leaf should either extract
a generic adapter underneath the list helper or add a small sibling helper for
editor/action mutations.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/shared/actionToasts.ts` if added.
- `core/admin/ui/shared/listActionToasts.ts` if it delegates to a generic
  helper.
- `tests/vitest/ui/action-toasts.test.ts` if a new helper is added.
- `tests/vitest/ui/list-action-toasts.test.ts`

## Implementation Direction

- Keep `resolveListActionErrorMessage` behavior available for list screens.
- If extracting a generic helper, preserve existing `listActionToasts` public
  exports so `TASK-208` consumers do not churn.
- Support action configs with explicit success and fallback error copy.
- Return emitted message text from helper methods so tests can assert adapter
  behavior without relying only on Sonner internals.
- Do not encode Pages-specific strings in the generic helper.

## Pseudocode

```ts
export const createAdminActionToastAdapter = <TAction extends string>(
  config: {
    actions: Record<TAction, { success: string; errorFallback: string }>;
  }
) => ({
  success(action: TAction) {
    const message = config.actions[action].success;
    toast.success(message);
    return message;
  },
  error(action: TAction, error: unknown) {
    const message = resolveActionErrorMessage(
      error,
      config.actions[action].errorFallback
    );
    toast.error(message);
    return message;
  },
});
```

## Security Contract

- Visibility: internal admin UI notification helper.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - helper normalizes errors to bounded user-facing strings;
  - helper does not log or display secret-like fields.

## Testing Requirements

- New helper tests:
  - success path calls `toast.success`;
  - error path calls `toast.error`;
  - `ApiClientError` message is preserved when safe;
  - non-API errors use fallback copy.
- Existing `tests/vitest/ui/list-action-toasts.test.ts` remains green.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md` only if shared notification helper docs are updated.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Non-list editor mutation toasts use a shared adapter.
2. List toasts remain backward compatible.
3. No component-local duplicate toast math is introduced.
