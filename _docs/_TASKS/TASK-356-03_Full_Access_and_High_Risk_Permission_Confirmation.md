# TASK-356-03: Full Access and High-Risk Permission Confirmation
# FileName: TASK-356-03_Full_Access_and_High_Risk_Permission_Confirmation.md

**Priority:** High
**Category:** Admin UI + Roles + RBAC + Security UX
**Estimated Effort:** Large
**Dependencies:** TASK-356-01, TASK-356-02, TASK-360-02
**Status:** Done (2026-06-01)

---

## Overview

Require explicit confirmation before any role is granted full access or a
high-risk permission set. This must cover `RoleEditor`, new roles, existing
roles, and matrix bulk/toggle-all paths.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `core/admin/ui/roles/PermissionsMatrixPage.tsx`
- `core/admin/ui/roles/PermissionsMatrix.tsx`
- `core/admin/ui/roles/RoleEditor.tsx`
- `core/admin/services/adminRolesClient.ts`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Shared RBAC helper module from `TASK-356-02` | Consume the high-risk permission taxonomy used by UI, tests, and audit. |
| `core/admin/ui/roles/RoleEditor.tsx` | Confirm `Select all`, create with full access, and save promotion to full access through one shared callsite contract used by Users and Roles Matrix. |
| `core/admin/ui/roles/PermissionsMatrixPage.tsx` | Mark matrix diffs that require full-access confirmation and block final save until confirmed. |
| `core/admin/ui/roles/PermissionsMatrix.tsx` | Ensure bulk toggle/all-permission paths cannot bypass confirmation. |
| Tests | Cover cancel/confirm, keyboard submit, new role, existing role, and matrix bulk paths. |

## Implementation Pseudocode

```ts
function requiresFullAccessConfirm(nextPermissions: string[]) {
  return nextPermissions.includes("*") ||
    nextPermissions.length >= ALL_PERMISSIONS.length ||
    nextPermissions.some(isHighRiskPermission);
}
```

Data flow:

- User action computes the next permission set before mutating persisted/draft
  state.
- If the next set grants `*`, all permissions, or high-risk scopes, store a
  pending action and open the shared confirm dialog.
- Cancel discards the pending promotion and leaves permissions unchanged.
- Confirm applies the draft promotion.
- Review modal blocks final save if any pending matrix diff requires full-access
  confirmation and has not been confirmed.

Error handling:

- Keyboard submit cannot bypass the confirmation gate.
- Badge text like `Full access` remains informational only and is not treated
  as consent.
- Stale role conflicts after confirm still keep the draft dirty and require
  refresh/retry.

## Security Contract

- Endpoint visibility: unchanged internal admin role endpoints.
- Auth model: authenticated admin session.
- RBAC: `roles:write` required for role create/update.
- CSRF: required for writes.
- Rate-limit bucket: `admin_write`.
- Reject unknown validation: unchanged strict role payload schemas.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Audit: full-access grants and high-risk permission additions must be
  auditable with role id/name and added permissions.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest helper tests for high-risk taxonomy.
- Vitest UI: `Select all` opens confirm, cancel leaves permissions unchanged,
  confirm applies full access.
- Vitest UI: create/save with full access cannot bypass confirm through
  keyboard submit.
- Vitest UI: matrix bulk toggle/review save cannot grant full access without
  same confirmation.
- Playwright admin fixture verifies full-access promotion requires confirm.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `_docs/RBAC_SPEC.md`
- `docs/guide/screens/roles-matrix.md`
- `docs/guide/screens/users.md` for `RoleEditor` reuse
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Any path that grants full access or high-risk scopes requires explicit
  confirmation.
- Read-only scopes such as `roles:read` are not high-risk by default unless a
  later product/security decision documents that stricter behavior.
- Cancel leaves role permissions unchanged.
- RoleEditor and Roles Matrix use the same high-risk taxonomy.

## Completion Notes

- Extended the shared roles risk helper with full-access detection,
  normalized permission-set comparison, and diff-aware high-risk addition
  classification.
- `RoleEditor` now gates `Select all`, high-risk permission toggles, and
  create/save submit through the shared confirm dialog before mutating or
  submitting high-risk/full-access grants.
- `RoleEditor` reuses confirmed risk signatures so adding low-risk permissions
  after a confirmed sensitive grant does not re-prompt, while clearing/removing
  risk resets the confirmation.
- Roles Matrix diffs now carry full-access/high-risk confirmation metadata. The
  review modal blocks final `Confirm changes` until the admin confirms
  high-risk/full-access diffs through the shared confirm dialog.
- Matrix `RoleEditor` instances are keyed per open action so stale confirmed
  risk state cannot leak across create-role sessions.
- Playwright CLI evidence verified real UI behavior for `Add Role -> Select
  all` cancel/confirm and matrix bulk full-access promotion. The temporary role
  reached `["*"]` only after high-risk confirmation and was removed after DB
  verification; local screenshot:
  `.tmp/task-356-03-full-access-confirm.png`.

Validation completed:

- `bun run test:vitest -- tests/vitest/ui/role-permission-risk.test.ts tests/vitest/ui/role-permission-diff.test.ts tests/vitest/ui/role-editor-wave.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/permissions-matrix.test.tsx tests/vitest/ui/permissions-matrix-leaf.test.tsx tests/vitest/ui/role-editor-wave.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx tests/vitest/ui/role-permission-diff.test.ts tests/vitest/ui/role-permission-risk.test.ts tests/vitest/admin/adminRolesClient.test.ts tests/vitest/ui/shared-dialog-contracts.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/adminRoles.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `playwright-cli -s task-356-03-full-access-confirm run-code ...` admin
  full-access confirmation pass
