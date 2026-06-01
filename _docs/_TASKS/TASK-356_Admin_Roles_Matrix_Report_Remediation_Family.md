# TASK-356: Admin Roles Matrix Report Remediation Family
# FileName: TASK-356_Admin_Roles_Matrix_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + RBAC + Roles Matrix + Audit + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-360-01 shared permission snapshot contract, TASK-355 shared Users/RoleEditor gating adoption, changelog 1034 and `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md` audit evidence
**Status:** To Do

---

## Overview

Turn `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md` into an
execution-ready remediation family for `/admin/roles`.

The report proves that the matrix draft model, search, cancel, and admin save
paths work. The remaining problems are security-sensitive UX issues: restricted
users can locally toggle checkboxes, `Add Role` remains active, full-access
selection is too easy, and mass RBAC updates are committed without a diff review
or confirmation.

## Source Evidence

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `core/admin/ui/roles/PermissionsMatrixPage.tsx`
- `core/admin/ui/roles/PermissionsMatrix.tsx`
- `core/admin/ui/roles/PermissionsMatrixSearch.tsx`
- `core/admin/ui/users/RoleEditor.tsx`
- `core/admin/services/adminRolesClient.ts`
- `core/admin/app/AdminApp.tsx`

## Remediation Scope

| Finding | Required outcome |
|---|---|
| Roles Matrix lacks permission gating | `roles:read` controls route access; `roles:write` controls add/save/edit/toggle interactions. |
| `Add Role` active for restricted users | Hidden or disabled for users without `roles:write`. |
| Matrix checkboxes editable for restricted users | Read-only matrix with explanatory access message. |
| `Save changes` commits mass RBAC updates without confirm | Review modal lists each role diff before the PATCH calls. |
| `Select all` full access lacks confirm | Full-access selection requires an explicit confirm step and high-risk copy. |
| Missing diff summary | Dirty footer shows counts and opens full diff review. |
| Missing audit-level diff contract | Server audit event records added/removed scopes by role where feasible. |

## Refinement Checklist

These refinements are mandatory for implementation planning and closure.

6. **High-risk taxonomy:** define one shared list of high-risk permissions
   before UI work (`*`, `roles:*`, `users:*`, `settings:*`, security/session/API
   key scopes) and reuse it in footer badges, review modal, and tests.
7. **Stale-role protection:** role saves must detect stale source data. If the
   backend supports version/update timestamps, send them; otherwise refresh and
   show conflict copy when a save returns conflict/412.
8. **Partial failure handling:** when several role PATCH calls are needed,
   define whether saves are atomic server-side or best-effort client-side. The
   UI must report exactly which roles failed and must not mark the draft clean
   for failed roles.
9. **Read-only semantics:** restricted users should still be able to search and
   inspect role permissions, but checkboxes must be disabled with accessible
   reason copy, not merely visually muted.
10. **RoleEditor reuse:** `RoleEditor` is used from Users and Roles surfaces;
   full-access confirmation and write gating must be consistent in both places.
11. **Matrix full-access path:** matrix-level bulk/toggle-all controls must not
    bypass full-access confirmation through the save-review modal. Any path
    that grants `*` or all permissions to a role must be classified as
    full-access promotion.

## Sub-Tasks

## Implementation Order

1. Consume `TASK-360-01` shared permission snapshot and read-only route mode.
2. Implement matrix read-only gating before changing save behavior.
3. Add pure diff builder and footer summary.
4. Add review modal and partial-failure/conflict behavior.
5. Add full-access confirmation in both `RoleEditor` and matrix promotion
   paths.
6. Add audit diff payload and final Playwright proof.

### TASK-356-01: Roles Matrix Permission-Aware Read-Only Mode

**Status:** To Do

Implementation shape:

- Accept explicit access flags from the admin shell:
  - `canReadRoles`
  - `canWriteRoles`
- If no `roles:read`, render access denied before fetching matrix data.
- If `roles:read` but not `roles:write`:
  - load and render the matrix,
  - disable checkboxes,
  - hide or disable `Add Role`,
  - hide `Save changes`,
  - keep search/filter usable.

Pseudocode:

```ts
type RolesMatrixAccess = {
  canReadRoles: boolean;
  canWriteRoles: boolean;
};

function resolveMatrixMode(access: RolesMatrixAccess) {
  if (!access.canReadRoles) return "denied";
  if (!access.canWriteRoles) return "readonly";
  return "editable";
}

function canTogglePermission(mode: "denied" | "readonly" | "editable") {
  return mode === "editable";
}
```

Error handling:

- API 403 during load moves the page to access-denied state.
- API 403 during save shows "Permissions changed; refresh required" and
  reloads the role payload.

Regression tests:

- Restricted user sees read-only matrix and cannot toggle.
- Restricted user has no active `Add Role` or `Save changes`.
- Admin user keeps existing editable behavior.
- Search works in read-only and editable modes.

### TASK-356-02: RBAC Diff Builder and Review Modal

**Status:** To Do

Implementation shape:

- Build a pure diff helper that compares the loaded role permissions with the
  draft matrix.
- Footer shows:
  - number of roles changed,
  - total added permissions,
  - total removed permissions,
  - high-risk marker when `*` or admin/security/settings permissions are added.
- `Save changes` opens a review modal.
- Review modal lists role-by-role added/removed scopes and requires confirm.
- Cancel closes modal without API calls.

Pseudocode:

```ts
type RolePermissionDiff = {
  roleId: string;
  roleName: string;
  added: string[];
  removed: string[];
  highRisk: boolean;
};

function buildRolePermissionDiffs(
  original: AdminRole[],
  draft: AdminRoleDraft[]
): RolePermissionDiff[] {
  return draft.flatMap((draftRole) => {
    const source = original.find((role) => role.id === draftRole.id);
    if (!source) return [];
    const before = new Set(source.permissions);
    const after = new Set(draftRole.permissions);
    const added = [...after].filter((permission) => !before.has(permission)).sort();
    const removed = [...before].filter((permission) => !after.has(permission)).sort();
    if (added.length === 0 && removed.length === 0) return [];
    return [{
      roleId: draftRole.id,
      roleName: draftRole.name,
      added,
      removed,
      highRisk: added.some(isHighRiskPermission),
    }];
  });
}
```

Data flow:

1. Matrix loads roles into `originalRoles`.
2. User edits `draftRoles`.
3. Diff helper derives `pendingDiffs` on render.
4. Footer displays summary.
5. Save opens review modal using `pendingDiffs`.
6. Confirm calls `updateAdminRole` only for roles with diffs.
7. Success replaces `originalRoles` and clears draft dirty state.

Regression tests:

- Diff helper handles add, remove, no-op, sorted output, and full access.
- Save cancel does not call `updateAdminRole`.
- Save confirm calls one PATCH per changed role, not every role.
- API error keeps draft and modal error visible.

### TASK-356-03: Full Access and High-Risk Permission Confirmation

**Status:** To Do

Implementation shape:

- `RoleEditor` must not immediately apply full access from `Select all` without
  a high-risk confirmation when the permission set includes `*` or all scopes.
- Existing badge `Full access` remains informational but is not a substitute
  for confirmation.
- The confirmation should include the role name and count of scopes.
- New roles with full access must require confirm before create.
- Existing roles promoted to full access must require confirm before save.
- Matrix column/row bulk toggles that produce full access must mark the pending
  diff as `requiresFullAccessConfirm` and the review modal must block final
  save until that confirmation is complete.

Pseudocode:

```ts
function requiresFullAccessConfirm(nextPermissions: string[]) {
  return nextPermissions.includes("*") || nextPermissions.length >= ALL_PERMISSIONS.length;
}

function classifyMatrixDiffForConfirm(diff: RolePermissionDiff) {
  const nextPermissions = applyDiffToRole(diff);
  return {
    ...diff,
    requiresFullAccessConfirm: requiresFullAccessConfirm(nextPermissions),
  };
}

async function handleSelectAll() {
  const next = ALL_PERMISSIONS.map((permission) => permission.key);
  if (requiresFullAccessConfirm(next)) {
    setPendingFullAccess(next);
    setFullAccessConfirmOpen(true);
    return;
  }
  setSelectedPermissions(next);
}
```

Regression tests:

- `Select all` opens confirm.
- Cancel leaves permissions unchanged.
- Confirm applies full access.
- Create/save with full access cannot bypass confirm through keyboard submit.
- Matrix bulk toggle/review-save cannot grant full access without the same
  confirmation.

### TASK-356-04: RBAC Audit Event Diff

**Status:** To Do

Implementation shape:

- Server-side role update audit events should include machine-readable
  `addedPermissions` and `removedPermissions` where the route/service can safely
  compare previous vs next permissions.
- Keep audit payload redacted: no session cookies, no request headers, no
  unrelated user data.
- UI review modal diff and backend audit diff should use the same semantics
  even if implemented by separate helpers.

Pseudocode:

```ts
function buildRoleAuditDiff(before: string[], after: string[]) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    addedPermissions: [...afterSet].filter((value) => !beforeSet.has(value)).sort(),
    removedPermissions: [...beforeSet].filter((value) => !afterSet.has(value)).sort(),
  };
}
```

Regression tests:

- Service/domain tests for diff output.
- Route audit test verifies update event contains role id/name and diff arrays.
- No audit payload includes secrets or request cookies.

## Security Contract

Route family: admin roles.

- Endpoint visibility: internal admin only (`/admin/api/admin-roles*`).
- Auth model: authenticated admin session.
- RBAC:
  - `roles:read` for list/matrix read.
  - `roles:write` for create/update/delete/duplicate/full-access changes.
- CSRF: required for all role writes.
- Rate-limit bucket: admin write.
- Reject unknown validation: all role write payloads schema-first and
  unknown-field rejecting.
- Anti-abuse: no public write endpoint; no nonce/HMAC/captcha required.
- Audit: role creates, deletes, full-access grants, and permission diff saves
  must emit audit events with role id/name and added/removed scopes.
- High-risk guard: adding `*`, `settings:*`, `roles:*`, `users:*`, or security
  permissions requires explicit UI confirmation before submit.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI tests for read-only matrix, diff footer, review modal, full-access
  confirm, and API error handling.
- Bun service/route tests for role update validation, RBAC, CSRF, and audit
  diff payload.
- Route registration tests and centralized `map*Error` coverage for
  `admin_role_invalid`, `admin_role_not_found`, `admin_role_conflict`,
  `admin_role_last_admin`, stale-version conflicts, and audit-write failures.
- Playwright:
  - admin can add/remove one permission and confirm diff,
  - restricted user cannot edit,
  - full-access requires confirm,
  - cancel paths do not mutate.
- `bun run gates:coderso` if RBAC release gates are touched.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/RBAC_SPEC.md`
- `_docs/AUDIT_SPEC.md` if audit payload changes.
- `_docs/CMS_API.md` for any route contract change.
- `docs/guide/screens/roles-matrix.md` for read-only mode, diff review,
  full-access confirmation, and cancel/save behavior.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1046-2026-06-01-task-356-admin-roles-matrix-remediation-family.md`

## Acceptance Criteria

- Users without `roles:write` cannot locally toggle matrix checkboxes or submit
  role changes.
- Every role save shows a reviewable diff before mutation.
- Full access cannot be selected or saved without explicit confirmation.
- Role update audit events include added/removed permission details.
- Report findings are updated with implementation evidence and test commands.
- Conflict/partial-failure behavior is covered by tests and documented in the
  report after implementation.
