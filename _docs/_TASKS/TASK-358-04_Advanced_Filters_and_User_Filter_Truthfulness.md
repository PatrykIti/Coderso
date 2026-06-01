# TASK-358-04: Advanced Filters and User Filter Truthfulness
# FileName: TASK-358-04_Advanced_Filters_and_User_Filter_Truthfulness.md

**Priority:** High
**Category:** Admin UI + Access Logs + Filters + Privacy
**Estimated Effort:** Medium
**Dependencies:** TASK-358-01, TASK-360-04
**Status:** To Do

---

## Overview

Make Access Logs advanced filter affordances truthful: the sliders button must
open a real filter panel or disappear, and the `User` filter must reflect
actual actor/user semantics without leaking extra PII.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `core/admin/ui/security/AccessLogsPage.tsx`
- `core/admin/ui/security/AccessLogsTable.tsx`
- Existing users/actors summary clients if available

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/security/AccessLogsPage.tsx` | Wire sliders trigger to advanced filters drawer or remove/disable it with truthful copy. |
| Access logs query helper | Normalize actor/user/role/method/IP filters into server query state. |
| Actor/user summary client if added | Fetch only safe summaries permitted for the current user. |
| Tests | Cover trigger behavior, labels, restricted PII, invalid filters, and active chips. |

## Implementation Pseudocode

```ts
type AccessAdvancedFilters = {
  userId?: string;
  method?: string;
  ip?: string;
};

// From TASK-358-01, AccessLogQuery keeps status?: "success" | "failed",
// userId?, method?, ip?, date range, limit, and cursor semantics.
// Role filtering requires a separate current-role join or historical role
// snapshot contract before it can become a server query field.

function resolveAccessFilterLabel(filter: AccessAdvancedFilters) {
  if (filter.userId) return "User";
  return "Advanced filters";
}

function buildAccessLogQueryFromFilters(
  base: AccessLogQuery,
  advanced: AccessAdvancedFilters
): AccessLogQuery {
  return normalizeAccessLogQuery({
    ...base,
    userId: advanced.userId,
    method: advanced.method,
    ip: advanced.ip,
  });
}
```

Data flow:

- Sliders button opens an advanced filters drawer with draft state, or is not
  rendered if the product rejects advanced filters.
- Apply validates draft values and normalizes them into URL/query state.
- List reloads from server through the Access Logs query contract.
- Active chips show exact query semantics, e.g. User vs Role.
- Dynamic user/actor summaries are cached/read-through and redacted based on
  the current user's permissions.

Error handling:

- Invalid IP/method values block apply and show field errors.
- User/actor lookup failure leaves text query usable and marks user filter
  unavailable.
- Restricted users receive redacted actor summaries and no extra email list
  unless the access log contract already permits it.

## Security Contract

- Endpoint visibility: internal admin for any actor/user summary endpoint.
- Auth model: authenticated admin session.
- RBAC: `audit:read` for access-log filter metadata; any broader user lookup
  must require the repo's user-read permission and return only safe summaries.
- CSRF: none for read-only filter metadata.
- Rate-limit bucket: `admin_read`.
- Reject unknown validation: strict query/filter schemas.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Privacy: filter metadata must not leak email/name/PII beyond what the current
  access log rows already expose to that permission set.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: sliders trigger opens drawer or is absent/disabled with truthful
  copy.
- Vitest UI: filter labels match actual semantics and active chips reflect
  normalized query state.
- Vitest UI/domain tests: invalid IP/method blocked.
- Bun route/privacy tests for any new actor/user summary endpoint.
- Restricted `audit:read` test proves no extra user PII leaks through filters.
- No-op audit gate from `TASK-360-04` must not flag Access Logs filter controls.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `docs/guide/screens/access-logs.md`
- `_docs/CMS_API.md` if a summary endpoint is added
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Sliders advanced-filter affordance is real or truthfully unavailable.
- `User` and `Role` labels match actual query behavior.
- Restricted filter metadata does not leak extra PII.
