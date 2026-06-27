# TASK-479-27-L05: Admin Screens Tests
# FileName: TASK-479-27-L05-Admin-Screens-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Admin Screens / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-27-L01, TASK-479-27-L02, TASK-479-27-L03, TASK-479-27-L04
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-27
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add Vitest render tests that lock the restyled structure of the four Admin
surfaces and prove the restyle preserved behavior: Users (tabs + stat row +
avatar/role/status/2FA table + partial-read gating), Roles matrix (sticky
permission column + grouped sections + member counts + read-only vs editable),
Audit (timeline rows with category badges + Export), and Access logs (stat row +
method/status tone table + revoke confirm). One new suite covers all four
surfaces.

- **Goal:** Guard L01–L04 against regressions with focused, deterministic render
  tests in the Bun-free admin Vitest lane.
- **Owning module/service:**
  `tests/vitest/ui-integration/admin-screens-restyle.test.tsx` (new), exercising
  `core/admin/ui/users/UsersRolesPage.tsx`,
  `core/admin/ui/roles/PermissionsMatrixPage.tsx`,
  `core/admin/ui/audit/AuditList.tsx`,
  `core/admin/ui/security/AccessLogsPage.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/RBAC_SPEC.md`,
  `_docs/AUDIT_SPEC.md`. Pattern reference: existing
  `tests/vitest/ui/users-roles.test.tsx`,
  `tests/vitest/ui/permissions-matrix.test.tsx`,
  `tests/vitest/ui/audit-list.test.tsx`,
  `tests/vitest/ui/access-logs.test.tsx`, and the harness in
  `tests/utils/adminRouterRender.tsx`.
- **Out of scope:** No runtime/Bun coverage moves; no new product code (that is
  L01–L04); no API/contract tests beyond what the UI render already exercises.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests use the existing
`renderAdminUi` harness with mocked service clients exactly as the existing admin
suites do; no real network, secrets, or RBAC bypass.

---

## Implementation Pseudocode

Reuse the established harness — `renderAdminUi` from
`tests/utils/adminRouterRender.tsx` for SSR-string assertions (as in
`tests/vitest/ui/users-roles.test.tsx`), and the `createRoot` + `act` +
`vi.hoisted` service mocks pattern (as in `tests/vitest/ui/access-logs.test.tsx`)
where interaction/DOM assertions are needed. Do NOT invent a new render utility.

```tsx
// tests/vitest/ui-integration/admin-screens-restyle.test.tsx
// @vitest-environment happy-dom
import { renderAdminUi } from "../../utils/adminRouterRender";
import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";
import { PermissionsMatrixPage } from "../../../core/admin/ui/roles/PermissionsMatrixPage";
import { AuditList } from "../../../core/admin/ui/audit/AuditList";
import { AccessLogsPage } from "../../../core/admin/ui/security/AccessLogsPage";
// + vi.hoisted mocks for adminUsersClient / adminRolesClient / auditClient /
//   accessLogsClient — copy the mock shapes from the existing per-screen suites.

// --- Users (L01) ---
test("Users screen renders the restyled header, stat row, and member tab", () => {
  const html = renderAdminUi(<UsersRolesPage permissions={["users:read","users:write","roles:read","roles:write"]} />);
  expect(html).toContain("Users &amp; Roles");   // real title preserved
  expect(html).toContain("Invite User");          // RBAC-gated action present with users:write
  // stat row labels + tab labels present; assert NO fabricated delta string.
});

test("Users screen hides the invite action and role names without write/read perms", () => {
  const html = renderAdminUi(<UsersRolesPage permissions={["users:read"]} />);
  // assert invite action absent; partial-read role affordance present (Hidden / reason).
});

// --- Roles matrix (L02) ---
test("Roles matrix renders grouped permission sections + role member counts (read-only)", async () => {
  // mock listAdminRoles + listPermissionCatalog; render with roles:read only.
  // assert: sticky "Permission" header, a group section label, static Check/Minus
  // glyphs, NO Save bar (read-only mode).
});

test("Roles matrix exposes editable cells + Save in roles:write mode", async () => {
  // render with roles:write via createRoot + act (renderAdminUi is SSR-only and
  // cannot click); toggle a cell -> diff/Save surfaces; Owner/* row stays full-access.
});

// --- Audit (L03) ---
test("Audit screen renders the timeline rows with category badges + Export", async () => {
  // mock listAuditLogs -> a couple of real-shaped AuditRecord rows.
  // assert: actor (entry.actor.name) / event (entry.event) / target
  // (entry.resourceLabel) text, a category Badge from the view-model entry.category
  // (one of authentication|content|system), the connector rail, and the Export button.
});

// --- Access logs (L04) ---
test("Access logs renders the stat row + method/status tone table", async () => {
  // mock listAccessLogs -> records with mixed methods/statuses.
  // assert: method Badge (GET=info ...) + status tone class; page-scoped stat
  // labels (e.g. "(page)"); assert NO fabricated "38,420" 24h total.
});
```

**Data flow:** mock the four service clients with `vi.hoisted` (return
real-shaped records / role+catalog payloads), render each page through
`renderAdminUi` (SSR string) or `createRoot`+`act` (DOM/interaction), then assert
structure + preserved gating. Seed permissions via the page's `permissions` prop
where supported (`UsersRolesPage` and `PermissionsMatrixPage` both accept it) or via
the mocked `useAdminAuth`/catalog where not (Audit/Access read from context).

**Error handling (test concerns):** stub `navigator.clipboard` where the audit
copy action is asserted; stub the download path for Export; assert the loading/
empty/partial-read states render; ensure no test depends on real timers/network.

**Regression-test shape:** Users (title, gated invite, stat/tab labels, partial-read
role hiding, no fabricated deltas); Roles (grouped sections, sticky col, member
counts, read-only glyphs vs editable cells + Save); Audit (timeline rows, category
badge from the view-model `entry.category`, Export); Access (method/status tone
table from `AccessLogItem`, honest page-scoped stats, no fabricated 24h total, no
invented Location column). Keep each `test` independent
(restore mocks + reset localStorage in `afterEach`).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/admin-screens-restyle.test.tsx`
- Regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/users-roles.test.tsx tests/vitest/ui/permissions-matrix.test.tsx tests/vitest/ui/audit-list.test.tsx tests/vitest/ui/access-logs.test.tsx tests/vitest/ui-integration/users.test.tsx tests/vitest/ui-integration/roles.test.tsx`
- State explicitly in the closeout if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-27-L05`.
- No contract-doc change expected (tests only); note the new suite path in the
  changelog entry.
