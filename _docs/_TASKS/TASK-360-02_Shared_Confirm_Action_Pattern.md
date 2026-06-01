# TASK-360-02: Shared Confirm Action Pattern
# FileName: TASK-360-02_Shared_Confirm_Action_Pattern.md

**Priority:** High
**Category:** Admin UI + Confirm UX + Accessibility + Audit
**Estimated Effort:** Large
**Dependencies:** TASK-360
**Status:** To Do

---

## Overview

Provide a reusable confirmation pattern for destructive, high-risk, and
lockout-prone Admin actions. Area tasks must reuse it instead of implementing
inconsistent one-off confirms.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `core/admin/ui/shared/ConfirmActionDialog.tsx`
- Area adoption tasks: TASK-355, TASK-356, TASK-358, TASK-359

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/shared/ConfirmActionDialog.tsx` | Add canonical action API, title/description requirement, loading/error state, typed confirmation, and focus return. |
| Shared confirm hook/helper if present | Expose a simple programmatic pattern for pages/components. |
| Existing callsites | Audit/migrate existing confirms or document unchanged compatibility. |
| Tests | Cover cancel no side effect, confirm once, typed confirmation, loading/error, a11y, and focus. |

## Implementation Pseudocode

```tsx
type ConfirmAction = {
  title: string;
  description: string;
  targetLabel?: string;
  confirmLabel: string;
  variant: "destructive" | "warning";
  requireTypedValue?: string;
  onConfirm: () => Promise<void>;
};
```

Data flow:

- Caller creates a `ConfirmAction` with redacted target labels and side-effect
  copy.
- Dialog renders required title/description and optional typed confirmation.
- Cancel closes and returns focus without calling `onConfirm`.
- Confirm sets loading, calls `onConfirm` once, shows errors inline, and closes
  only on success unless caller opts out.
- Domains with audit support attach audit-safe metadata in their own service
  layer, not in the UI dialog.

Error handling:

- `onConfirm` rejection keeps dialog open and shows retry-capable error.
- Double submit is prevented while loading.
- Typed confirmation mismatches block submit.
- Dialog remains keyboard accessible and always has title/description.

## Security Contract

- Endpoint visibility: none; UI-only shared component.
- Auth/RBAC/CSRF/rate-limit: enforced by adopting route/client actions.
- Reject unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: confirm descriptions/target labels must use redacted display
  values only.
- Audit: adopting domains with audit trails must emit redacted audit events in
  service/route code; domains without audit support must document the gap.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI tests for cancel no call, confirm one call, loading, error retry,
  typed confirmation, title/description presence, keyboard behavior, and focus
  return.
- Migration audit test or checklist covering Users, Roles, Access Logs, and
  Settings adopting callsites.
- Playwright spot check for at least one destructive and one warning confirm.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- Admin UI contributor docs or `_docs/ARCHITECTURE.md` section for confirm use
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Shared confirm pattern exists and is accessible.
- Cancel paths are side-effect-free.
- Area tasks can reuse one API for destructive/high-risk actions.

