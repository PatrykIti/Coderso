# 1045 - TASK-355 Admin Users remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-355, TASK-355-01, TASK-355-02, TASK-355-03, TASK-355-04, TASK-355-05

## Key Changes

### Planning / QA

- Added the report-driven remediation family for the Admin Users audit.
- Captured execution-ready scope for permission-aware UI gating, reset-password
  truthfulness, login-capable invite flow, destructive confirms, filter
  affordance cleanup, notification switch truthfulness, and mobile sheet
  accessibility.
- Recorded the security contract for internal admin users/roles routes,
  password reset handling, CSRF, RBAC, rate limiting, strict validation, audit
  events, and secret handling.
- Split the family into physical execution leaf files:
  `TASK-355-01` through `TASK-355-05`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.
- Refined drift found by agent/Claude review: aligned bootstrap rate buckets
  with `_docs/SECURITY_SPEC.md`, kept invite/reset on the existing
  reset-confirm auth route, fixed role editor ownership paths, and clarified
  destructive/notification/mobile leaf ownership.
- Follow-up drift pass added the backend `GET /auth/me` + `getUserPermissions`
  source of truth for permission snapshots, fixed the `AdminApp` path, linked
  destructive role confirms to the `TASK-356-02` high-risk helper, and kept
  invites on the existing `status: "pending"` user enum.

### TASK-355-01 Permission Propagation

- Updated `/admin/users` route and sidebar visibility so the Users area opens
  when the current admin has either `users:read` or `roles:read`, while missing
  both permissions still renders access denied before Users/Roles fetches.
- Removed the Users page fail-open default permission list and made the page
  consume the shared Admin permission snapshot through `useAdminAuth`.
- Added partial-read behavior:
  `users:read` only fetches users and hides role cards/catalog/filter details;
  `roles:read` only fetches roles/catalog and hides the user table/invite flow.
- Disabled or hid user/role write controls before submit unless the matching
  read/write prerequisites are present, including the right-side details drawer
  edit action.
- Refreshes the shared permission snapshot after stale 403 or
  `permission_denied` API responses.
- Gated Admin shell global reads for settings, theme tokens, custom-screen
  shortcuts, and solution-kit navigation context so restricted Users/Roles
  sessions do not trigger unrelated 403s.
- Split user lifecycle writes from role-assignment writes: status/delete can use
  `users:write`, while edit/invite role assignment still requires `roles:read`.

### TASK-355-02 Login-Capable Invite and Reset

- Added a real admin set-password invite endpoint and typed client. Invites now
  create `pending` users, issue hashed single-use tokens, and send the token
  only through configured email delivery.
- Added admin-triggered password reset delivery through
  `POST /admin-users/:id/password-reset`, guarded by `users:write`, strict
  `{ delivery: "email" }` validation, CSRF/admin-write middleware, audit
  metadata without tokens, and mapped delivery errors.
- Removed the normal admin `password` create/update path from HTTP schemas,
  client types, and service inputs so admins no longer set another user's
  password directly.
- Reset tokens now invalidate prior outstanding tokens and expose stable
  `set_password_token_invalid`, `set_password_token_expired`, and
  `set_password_token_used` route errors.
- `/auth/reset` now sends the configured set-password email instead of creating
  and discarding a token, and `/auth/reset/confirm` activates only `pending`
  users after a successful password set.
- Users UI now opens a confirm dialog for `Reset password`, keeps invite errors
  visible without closing the dialog, removes the reset no-op marker, and routes
  `UserEditor` create mode through the same invitation delivery path.

### TASK-355-03 Destructive Action Confirmation

- Users row actions and details drawer lifecycle actions now route deactivate
  and delete through the shared confirm dialog with target identity, cancel
  safety, retryable errors, and focus-return coverage.
- Reactivating an account requires confirmation when the role risk is high or
  cannot be verified because the current admin lacks `roles:read`.
- Role delete always requires confirmation, while duplicate role requires
  confirmation only for `*` or high-risk permission scopes imported from the
  shared roles risk helper.
- Role duplicate payloads now carry `sourceRoleId` and `sourceRoleName` for
  audit metadata; the route strips those fields before persistence.
- Added redacted audit events for user disable/enable/delete and role
  create/update/duplicate/delete, plus centralized role error mapping for
  `role_not_found`, `role_exists`, `permission_invalid`, and `last_admin`.

### TASK-355-04 Filter and Notification Truthfulness

- Kept the existing search, role, and status filters active while making the
  extra advanced-filter icon a truthful disabled/unavailable control with
  accessible label, title reason, and shared no-op gate coverage.
- Notification switches in user details now read as managed read-only states
  instead of suggesting local preference persistence.
- Updated user docs and audit reports so the unavailable/read-only path is
  documented as the shipped product behavior, not as a lingering placeholder.

## Validation

- `bun run test:vitest -- tests/vitest/ui/users-roles-page-wave.test.tsx tests/vitest/ui/users-roles.test.tsx tests/vitest/ui-integration/users.test.tsx tests/vitest/ui-integration/roles.test.tsx tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx tests/vitest/ui/user-details-drawer-wave.test.tsx tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/user-list-filters-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/auth.test.ts tests/integration/routes/adminUsers.test.ts tests/integration/routes/adminRoles.test.ts tests/unit/auth/rbac.test.ts`
- `bun run test:vitest -- tests/vitest/admin/adminUsersClient.test.ts tests/vitest/ui/users-roles-page-wave.test.tsx tests/vitest/ui/invite-user.test.tsx tests/vitest/ui/user-editor-wave.test.tsx tests/vitest/ui/user-details-drawer-wave.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/auth/passwordResetService.test.ts tests/integration/routes/adminUsers.test.ts tests/integration/routes/auth.test.ts tests/unit/admin/usersService.test.ts tests/unit/email/emailSettingsService.test.ts`
- `bun run test:vitest -- tests/vitest/ui/users-roles-page-wave.test.tsx tests/vitest/ui/user-details-drawer-wave.test.tsx tests/vitest/ui/role-list-wave.test.tsx tests/vitest/ui/role-permission-risk.test.ts tests/vitest/ui/shared-dialog-contracts.test.tsx tests/vitest/admin/adminRolesClient.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/adminUsers.test.ts tests/integration/routes/adminRoles.test.ts`
- `bun run test:vitest -- tests/vitest/ui/user-list-filters-wave.test.tsx tests/vitest/ui/user-details-drawer-wave.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:semgrep` (0 findings; one non-blocking Semgrep rule timeout in
  `core/db/schema.ts`)
- `bun run scan:trivy` (0 HIGH/CRITICAL vuln findings, 0 Dockerfile
  misconfigurations, no secret findings)
- `bun run scan:gitleaks:worktree` (no leaks found)
- Source evidence: `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`.
