# TASK-356-04: RBAC Audit Event Diff
# FileName: TASK-356-04_RBAC_Audit_Event_Diff.md

**Priority:** High
**Category:** Admin API + Roles + Audit + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-356-02, TASK-356-03
**Status:** Done (2026-06-01)

---

## Overview

Record machine-readable role audit metadata for role create/update/delete and
added/removed permission diffs in role update audit events so RBAC changes can
be reviewed after the fact with the same semantics shown in the Roles Matrix
review modal.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `core/admin/services/adminRolesClient.ts`
- Admin role route/service modules
- Audit service/domain modules
- `_docs/AUDIT_SPEC.md`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Admin role service/domain module | Build before/after permission diffs during role update and role snapshot metadata for create/delete. |
| Audit service/domain module | Accept redacted role permission diff metadata. |
| Admin role route tests | Assert audit event contains role id/name and added/removed permission arrays. |
| Audit docs/tests | Cover secret redaction and stable machine-readable fields. |

## Implementation Pseudocode

```ts
type RoleAuditPermissionDiff = {
  addedPermissions: string[];
  removedPermissions: string[];
};

function buildRoleAuditDiff(before: string[], after: string[]): RoleAuditPermissionDiff {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    addedPermissions: [...afterSet].filter((value) => !beforeSet.has(value)).sort(),
    removedPermissions: [...beforeSet].filter((value) => !afterSet.has(value)).sort(),
  };
}
```

Data flow:

- Role update service loads the current persisted permission list.
- Service validates and normalizes the requested next permission list.
- Service builds a diff before writing or inside the same transaction when
  available.
- Audit event records role id/name plus sorted added/removed arrays.
- Create/delete audit events record role id/name and redacted permission ids;
  full-access grants are tagged explicitly.
- UI review diff and backend audit diff use the same semantics even if they are
  implemented by separate helpers.

Error handling:

- If role lookup fails, return the existing role not-found domain error.
- If audit write fails and the existing contract treats audit as required,
  surface a mapped audit failure without committing a misleading success.
- If audit is best-effort in the current architecture, log only redacted
  metadata and keep the domain error semantics documented.

## Security Contract

- Endpoint visibility: unchanged internal admin role endpoints.
- Auth model: authenticated admin session.
- RBAC: `roles:write` for role updates.
- CSRF: required for role writes.
- Rate-limit bucket: `admin_write`.
- Reject unknown validation: strict role update schema remains required.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Audit: payload includes role id/name, action type, sorted added/removed
  permissions for updates, and redacted permission snapshots for create/delete;
  excludes session cookies, request headers, auth tokens, password material,
  and unrelated user data.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Service/domain tests for diff output: added, removed, no-op, sorted,
  duplicate-normalized inputs.
- Bun route audit tests for create, update diff, full-access grant, and delete
  event metadata.
- Secret redaction test proving audit payload excludes cookies/headers/tokens.
- Route registration and centralized `map*Error` coverage for audit-write
  failure if the route maps that error class.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `_docs/AUDIT_SPEC.md`
- `_docs/RBAC_SPEC.md`
- `_docs/CMS_API.md` if response/error semantics change
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Role create/update/delete audit events include deterministic redacted
  permission metadata, and updates include added/removed permission arrays.
- Audit payloads remain redacted and machine-readable.
- Audit semantics match the diff review users saw before save.

## Completion Notes

- Added `roleAuditMetadata` as the domain owner for redacted permission
  snapshots and deterministic added/removed role permission diffs.
- `updateRoleWithTransition` now reads the locked current role row and writes
  the update in one service transaction, returning before/after snapshots for
  audit metadata instead of letting the route perform a separate stale lookup.
- Role create/duplicate/delete audit metadata now includes `roleId`, `name`,
  sorted stored `permissions`, and `fullAccess`.
- Role update audit metadata now includes `roleId`, `name`, sorted stored
  `permissions`, `fullAccess`, and sorted `addedPermissions` /
  `removedPermissions`; full-access grants expand `*` against the current
  permission catalog for reviewability.
- DB-backed service coverage verifies `updateRoleWithTransition` returns the
  persisted before/after snapshots used by audit metadata.
- Route tests now assert `roles:read`/`roles:write` guard wiring and exact
  expanded full-access diff output.
- Audit metadata tests cover cookie/header/token/password redaction, including
  nested request header payloads.
- No `_docs/CMS_API.md` change was required because response and error
  semantics for `/admin-roles` did not change.
