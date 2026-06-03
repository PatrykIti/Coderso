# TASK-359-01: Settings RBAC Guard and Bootstrap Discipline
# FileName: TASK-359-01_Settings_RBAC_Guard_and_Bootstrap_Discipline.md

**Priority:** High
**Category:** Admin UI + Settings + RBAC + Auth Bootstrap
**Estimated Effort:** Large
**Dependencies:** TASK-359, TASK-360-01
**Status:** Done (2026-06-01)

---

## Overview

Gate all `/admin/settings/**` surfaces through the shared permission snapshot so
users without `settings:read` do not see Settings navigation, Settings shell
content, or avoidable `GET /admin/api/settings` 403s.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/layouts/SettingsShell.tsx`
- `core/admin/ui/settings/**`
- `core/admin/services/settingsClient.ts`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/app/AdminApp.tsx` | Hide/deny Settings route from shared permission snapshot before shell/content render. |
| Settings route registration/nav helpers | Show Settings nav only with `settings:read`. |
| `core/admin/ui/layouts/SettingsShell.tsx` | Render shared access denied instead of default Settings content when denied. |
| `core/admin/services/settingsClient.ts` | Ensure global settings bootstrap is not called without `settings:read`. |
| Tests | Cover nav absence, direct URL denied, no request, and backend 403 defense. |

## Implementation Pseudocode

```ts
function shouldLoadGlobalSettings(can: (permission: string) => boolean) {
  return can("settings:read");
}

function resolveSettingsRouteAccess(can: (permission: string) => boolean) {
  return {
    canReadSettings: can("settings:read"),
    canWriteSettings: can("settings:write"),
    canManageSecurity: can("security:write") || can("settings:write"),
  };
}
```

Data flow:

- Auth bootstrap returns the current user's effective permission snapshot.
- Admin shell decides whether Settings nav/routes are visible.
- Settings routes resolve access before rendering `SettingsShell`.
- Global `getSettings()` and section-specific reads run only when read
  permission exists.
- Backend 403 remains defense-in-depth and refreshes permissions when stale.

Error handling:

- Missing permission snapshot fails closed for Settings reads/writes.
- Direct `/admin/settings` URL without `settings:read` renders shared access
  denied and no default Settings content.
- 403 after previously allowed UI shows permission-stale copy and refreshes
  current-user permissions.

## Security Contract

- Endpoint visibility: internal admin settings routes.
- Auth model: authenticated admin session.
- RBAC: `settings:read` for settings reads; writes remain gated by their
  specific write/security permissions.
- CSRF: unchanged; not required for read-only GET.
- Rate-limit bucket: `admin_read` for settings reads.
- Reject unknown validation: no request body on reads; strict validation for
  existing writes remains required.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Secret handling: permission bootstrap and denied shell must not expose
  settings secrets.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: restricted user without `settings:read` sees no Settings nav link.
- Vitest UI: direct `/admin/settings` shows access denied and not default page.
- Vitest UI/client test: no `GET /admin/api/settings` fires without
  `settings:read`.
- Bun route tests: backend 403 for settings read without permission remains
  covered.
- Playwright restricted fixture proves Settings is unavailable without 403 loop.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/RBAC_SPEC.md`
- Settings screen docs as applicable: `docs/guide/screens/general-settings.md`,
  `docs/guide/screens/site-settings.md`, `docs/guide/screens/security-settings.md`,
  `docs/guide/screens/email-settings.md`, `docs/guide/screens/storage-settings.md`,
  `docs/guide/screens/assistant-settings.md`, and `docs/guide/screens/sessions.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Completion Notes

- `/admin/settings/**` routes consume the shared permission snapshot and render
  the shared `Access denied` state before Settings shell content when
  `settings:read` is absent.
- The global Settings bootstrap is gated by `settings:read`; restricted users
  do not perform normal-UX `GET /admin/api/settings` requests.
- Settings navigation is hidden without `settings:read`, including the
  previously missed Users/Roles breadcrumb drift where `Settings` labels linked
  to `/admin/settings`.
- Final review also closed the matching Audit/Access breadcrumb drift where
  `Security` labels linked to `/admin/settings/security` for `audit:read` users
  without `settings:read`.
- Backend read guards remain wired to `settings:read`, and the route test now
  proves a 403 stops the read handler before service work.

## Validation

- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx tests/vitest/ui/users-roles-page-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/settings.test.ts`
- `set -a && source .env && set +a && bun .tmp/task-359-01-fixture.ts cleanup && set -a && source .env && set +a && bun .tmp/task-359-01-fixture.ts && bun .tmp/task-359-01-playwright-runner.ts; status=$?; set -a && source .env && set +a && bun .tmp/task-359-01-fixture.ts cleanup; exit $status`
  passed with `settingsLinksOnAllowedRoute: 0`, `settingsRequests: []`, and
  `settingsResponses: []`. Evidence screenshot:
  `.tmp/task-359-01-settings-rbac.png`.
- `set -a && source .env && set +a && bun .tmp/task-359-01-audit-fixture.ts cleanup && set -a && source .env && set +a && bun .tmp/task-359-01-audit-fixture.ts && bun .tmp/task-359-01-audit-playwright-runner.ts; status=$?; set -a && source .env && set +a && bun .tmp/task-359-01-audit-fixture.ts cleanup; exit $status`
  passed with empty Settings links on `/admin/audit` and `/admin/access-logs`,
  plus `settingsRequests: []` and `settingsResponses: []`. Evidence screenshot:
  `.tmp/task-359-01-audit-rbac.png`.

## Acceptance Criteria

- Settings route/nav are fail-closed for users without `settings:read`.
- Restricted users do not trigger normal-UX settings 403s.
- Backend RBAC coverage remains intact.
