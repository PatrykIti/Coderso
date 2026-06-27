# TASK-479-27: Admin Screens (Users, Roles, Audit, Access) Migration
# FileName: TASK-479-27-Admin-Screens.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Admin Screens
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype of the four **Admin** surfaces —
Users & Roles, Roles matrix, Audit logs, and Access logs — into the REAL admin
under `core/admin/**`. This is a **visual restyle only**: the soft & friendly
(Notion-like) design language — VIOLET accent, `rounded-2xl` cards, soft
shadows, warm neutrals, light default + dark toggle — is applied to the existing
surfaces while real data, RBAC gating, partial-read modes, the audit/access
export contracts, cursor pagination, the permission diff/save model, the
revoke-access action, and all navigation helpers stay exactly as they are.

- **Goal:** Make the four real Admin screens look like the prototype — member
  tabs + stat row + soft DataTable on Users; a calm permission×role matrix with
  member counts and a legend on Roles; an avatar timeline list with category
  badges + export on Audit; a stat row + soft DataTable on Access logs — without
  changing any data flow, permission semantics, export payloads, or endpoints.
- **Owning module/service:**
  - `core/admin/ui/users/UsersRolesPage.tsx` (+ `UserList.tsx`, `UsersTable.tsx`,
    `UserFilters.tsx`, `UserDetailsDrawer.tsx`, `InviteUserDialog.tsx`).
  - `core/admin/ui/roles/PermissionsMatrixPage.tsx` (+ `PermissionsMatrix.tsx`).
  - `core/admin/ui/audit/AuditList.tsx` (+ `AuditTable.tsx`, `AuditFilters.tsx`,
    `AuditDetailsDrawer.tsx`).
  - `core/admin/ui/security/AccessLogsPage.tsx` (+ `AccessLogsTable.tsx`,
    `AccessLogDetailsDrawer.tsx`).
  - Reusing `core/admin/ui/shared/*` (`PageHeader`, `SectionHeader`,
    `AdminLink`, `ConfirmActionDialog`, `ExportDialog`, `ListPaginationFooter`)
    and the shared pattern library delivered by TASK-479-06-L02
    (`StatCard`, `DataTable`, `FilterBar`, `Pagination`, `StatusBadge`,
    `SectionCard`) plus `core/admin/components/ui/*`.
- **Source-of-truth docs:** `_docs/RBAC_SPEC.md`, `_docs/AUDIT_SPEC.md`,
  `_docs/DESIGN_TOKENS.md`, `_docs/_PROTOTYPE/README.md`,
  `_docs/_PROTOTYPE/src/styles/theme.css`. Prototype reference screens:
  `_docs/_PROTOTYPE/src/pages/admin/UsersRolesPage.tsx`,
  `_docs/_PROTOTYPE/src/pages/admin/PermissionsMatrixPage.tsx`,
  `_docs/_PROTOTYPE/src/pages/admin/AuditLogsPage.tsx`,
  `_docs/_PROTOTYPE/src/pages/admin/AccessLogsPage.tsx`.
- **Out of scope:** Any change to `adminUsersClient`, `adminRolesClient`,
  `auditClient`, `accessLogsClient`, the audit/access **export** contracts, the
  permission catalog or role-permission **diff/save** model, the **revoke
  access** mutation, cursor pagination semantics, RBAC permission strings,
  partial-read fallback modes, or `adminPaths`/`AdminLink` navigation. No new
  routes, no new endpoints, no editor behavior. The prototype's mock data
  (`PEOPLE`, hard-coded `EVENTS`/`ROWS`, fabricated stat deltas) is illustrative
  only — bind every visual to REAL loaded data; never ship invented counts.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Each surface keeps its current RBAC gates:
Users (`users:read`/`users:write`, `roles:read`/`roles:write` with partial-read
fallbacks), Roles matrix (`roles:read` read-only / `roles:write` editable),
Audit (`audit:read` + export), Access logs (read + `revokeAccessFromLog`
behind its existing confirm + RBAC). CSRF on admin writes is unchanged; no new
fields enter client cache, logs, or debug payloads.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-27-L01 | Users & Roles Restyle | ⏳ To Do |
| TASK-479-27-L02 | Roles Matrix Restyle | ⏳ To Do |
| TASK-479-27-L03 | Audit Logs Restyle | ⏳ To Do |
| TASK-479-27-L04 | Access Logs Restyle | ⏳ To Do |
| TASK-479-27-L05 | Admin Screens Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/users-roles.test.tsx tests/vitest/ui/permissions-matrix.test.tsx tests/vitest/ui/audit-list.test.tsx tests/vitest/ui/access-logs.test.tsx tests/vitest/ui-integration/users.test.tsx tests/vitest/ui-integration/roles.test.tsx`
- New restyle suite added in L05 (see that leaf for the exact path), run with the
  same `NODE_ENV=test vitest run --config vitest.config.ts <suite>` form.
- All pre-existing Admin-screen Vitest suites must stay green (the restyle must
  not alter observable hydration, partial-read modes, dirty-state protection,
  permission diff/save, export, revoke, or pagination behavior).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board (move this subtask + its leaves through
  the status buckets) and the Statistics block on every status change.
- On closure, add a `_docs/_CHANGELOG/` entry linking `TASK-479` and the closed
  leaf id(s).
- Touch `_docs/RBAC_SPEC.md` / `_docs/AUDIT_SPEC.md` only if a user-visible label
  changes; document no behavior change (there are none).
