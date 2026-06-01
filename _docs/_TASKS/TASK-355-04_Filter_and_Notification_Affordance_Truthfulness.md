# TASK-355-04: Filter and Notification Affordance Truthfulness
# FileName: TASK-355-04_Filter_and_Notification_Affordance_Truthfulness.md

**Priority:** High
**Category:** Admin UI + Users + UX Truthfulness
**Estimated Effort:** Medium
**Dependencies:** TASK-355-01, TASK-360-04, TASK-360-06
**Status:** To Do

---

## Overview

Remove or implement Users controls that currently look interactive but do not
perform the advertised work: the ghost filter icon and static email
notification switches.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `core/admin/ui/users/UserFilters.tsx`
- `core/admin/ui/users/UserDetailsDrawer.tsx`
- `core/admin/ui/users/UsersRolesPage.tsx`
- `core/admin/services/adminUsersClient.ts`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/users/UserFilters.tsx` | Connect the filter button to real advanced filters or remove/disable it with truthful copy. |
| `core/admin/ui/users/UsersRolesPage.tsx` | Wire advanced filter state into the existing list reload/server-query path. |
| `core/admin/ui/users/UserDetailsDrawer.tsx` | Persist notification preferences or render controls read-only with accurate managed-elsewhere copy. |
| `core/admin/services/adminUsersClient.ts` | Add typed query/preferences client only if backend persistence exists in this leaf. |
| Tests | Cover active filter counts, query payloads, disabled/read-only notification state, and no-op audit gate. |

## Implementation Pseudocode

```ts
type UserAdvancedFilters = {
  status?: "active" | "inactive" | "pending";
  roleId?: string;
};

function normalizeUserAdvancedFilters(input: unknown): UserAdvancedFilters {
  return userAdvancedFiltersSchema.parse(input);
}

function buildAdminUsersQuery(search: string, filters: UserAdvancedFilters) {
  return normalizeAdminUsersQuery({
    q: search.trim() || undefined,
    status: filters.status,
    roleId: filters.roleId,
  });
}
```

Data flow:

- If advanced filters are implemented, the filter button opens a drawer/sheet
  with stable state for status, role, and search facets.
- Applying filters builds a schema-normalized query and reloads through the
  existing server-side users list path.
- The trigger exposes an accessible name and active-filter count.
- Notification controls either persist through a schema-first preferences API
  or render as disabled/read-only states with clear product copy.

Error handling:

- Invalid query/filter values are rejected before fetch and surfaced as a
  validation message.
- Role filters are unavailable in `users:read` only mode when role data cannot
  be fetched.
- Static `defaultChecked` switches must not remain active-looking.

## Security Contract

- Endpoint visibility: internal admin only for any users query/preferences
  endpoint touched by this leaf.
- Auth model: authenticated admin session.
- RBAC: `users:read` for filters/list query; `users:write` or a narrower
  preferences permission for notification preference writes if added.
- CSRF: required for preferences writes; not required for read-only GET.
- Rate-limit bucket: `admin_read` for query and `admin_write` for preferences.
- Reject unknown validation: strict schemas for query params and any
  preferences payload.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Secret handling: notification preference payloads cannot include provider
  secrets, SMTP credentials, tokens, or privileged settings.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: filter trigger opens/closes drawer or is absent/disabled;
  active-filter count updates; role filter unavailable without `roles:read`.
- Vitest UI: notification controls are either persisted or visibly
  disabled/read-only and cannot submit.
- Bun route/service tests for any new query/preferences schema and mapped
  validation errors.
- No-op audit gate from `TASK-360-04` must not flag remaining Users controls.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `docs/guide/screens/users.md`
- `_docs/CMS_API.md` if a preferences endpoint is added
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Users filter affordance either performs real filtering or is truthfully
  unavailable.
- Notification switches no longer appear as active writable controls when no
  persistence exists.
- No remaining Users no-op controls are reported by the shared audit gate.
