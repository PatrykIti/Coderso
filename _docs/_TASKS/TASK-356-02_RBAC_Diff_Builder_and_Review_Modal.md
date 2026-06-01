# TASK-356-02: RBAC Diff Builder and Review Modal
# FileName: TASK-356-02_RBAC_Diff_Builder_and_Review_Modal.md

**Priority:** High
**Category:** Admin UI + Roles Matrix + RBAC + Safety UX
**Estimated Effort:** Large
**Dependencies:** TASK-356-01, TASK-360-02
**Status:** To Do

---

## Overview

Add a pure RBAC diff builder and review modal so mass permission edits are
reviewed role-by-role before any PATCH calls are submitted.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `core/admin/ui/roles/PermissionsMatrixPage.tsx`
- `core/admin/ui/roles/PermissionsMatrix.tsx`
- `core/admin/services/adminRolesClient.ts`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| New or existing roles matrix helper module | Add pure `buildRolePermissionDiffs` and high-risk classification helpers. |
| `core/admin/ui/roles/PermissionsMatrixPage.tsx` | Derive pending diffs, footer counts, review modal state, and confirm submit flow. |
| `core/admin/ui/roles/PermissionsMatrix.tsx` | Preserve draft updates while leaving final save to the review modal. |
| `core/admin/services/adminRolesClient.ts` | Ensure PATCH payloads are sent only for changed roles. |
| Tests | Cover pure diff helper, footer, cancel, confirm, partial failure, and conflict handling. |

## Implementation Pseudocode

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

- Matrix loads roles into `originalRoles`.
- User edits `draftRoles`.
- Render derives `pendingDiffs` through the pure helper.
- Dirty footer displays changed role count, added count, removed count, and
  high-risk marker.
- Save opens a review modal listing role-by-role added/removed scopes.
- Confirm calls `updateAdminRole` only for roles with diffs.
- Full success replaces `originalRoles` and clears dirty state.

Error handling:

- Cancel closes the review modal without API calls.
- Partial failure keeps failed role diffs dirty and reports exact failed roles.
- Conflict/stale-version responses keep the draft, show conflict copy, and
  require refresh before retry.
- Empty diff disables save.

## Security Contract

- Endpoint visibility: unchanged internal admin role endpoints.
- Auth model: authenticated admin session.
- RBAC: `roles:write` required for all PATCH calls.
- CSRF: required for PATCH.
- Rate-limit bucket: admin write.
- Reject unknown validation: PATCH payloads must be schema-first and reject
  unknown fields.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Audit: update events should record changed role identity and permission diff
  once `TASK-356-04` lands.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest pure helper tests for add, remove, no-op, sorted output, unknown draft
  role, and high-risk additions.
- Vitest UI tests for footer counts, review modal contents, cancel no client
  call, confirm one PATCH per changed role, API error visible, and draft kept.
- Bun route/service tests for existing role update validation/RBAC remain green.
- Playwright admin fixture adds/removes one permission, reviews diff, confirms,
  and verifies final matrix state.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `docs/guide/screens/roles-matrix.md`
- `_docs/RBAC_SPEC.md` if save semantics are documented there
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- `Save changes` cannot commit matrix edits without a diff review.
- Review modal lists added and removed scopes per role.
- Cancel is side-effect-free, and failed saves do not mark the draft clean.

