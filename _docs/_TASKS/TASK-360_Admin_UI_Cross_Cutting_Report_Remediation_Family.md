# TASK-360: Admin UI Cross-Cutting Report Remediation Family
# FileName: TASK-360_Admin_UI_Cross_Cutting_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + Cross-Cutting RBAC + Accessibility + QA Gates + Docs
**Estimated Effort:** Very Large
**Dependencies:** changelog 1034 and `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md` audit evidence
**Status:** To Do

---

## Overview

Turn `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md` into the
cross-cutting remediation family that coordinates defects spanning multiple
Admin reports. This family should not duplicate every area-local fix; it owns
shared contracts, release gates, evidence reconciliation, and prevention of
future drift.

The summary report identifies the repeated root causes:

- current user permissions are not propagated to route/menu/components;
- active-looking no-op controls are scattered across Admin surfaces;
- destructive/high-risk actions often lack confirmation;
- drawers/sheets have accessibility description gaps;
- server-side filtering/pagination/export contracts are incomplete;
- Settings cache/navigation behavior diverges from the shared admin cache/SPA
  contract.

## Source Evidence

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/shared/AdminLink.tsx`
- `core/admin/ui/shared/ExportDialog.tsx`
- `core/admin/ui/shared/ConfirmActionDialog.tsx`
- `core/admin/ui/**`
- `tests/perf/**`, `tests/security/**`, and admin Playwright harness owners
  discovered during implementation.

## Remediation Scope

| Cross-cutting finding | Owning task relationship |
|---|---|
| Current-user `can(permission)` missing in UI | Shared contract here; area adoption in TASK-355, TASK-356, TASK-359. |
| UI-only active controls | Shared no-op audit/gate here; area fixes in TASK-355, TASK-357, TASK-358, TASK-359. |
| Destructive actions without confirm | Shared confirm pattern here; area adoption in TASK-355, TASK-356, TASK-358, TASK-359. |
| Sheet/Drawer a11y warnings | Shared test/gate here; component fixes in area tasks. |
| Export dialog close-only behavior | Shared export contract here; audit/access adoption in TASK-357/TASK-358. |
| Server-side filters/pagination/export | Shared API conventions here; area implementation in TASK-357/TASK-358. |
| Settings SPA/cache drift | Gate and docs here; implementation in TASK-359. |
| QA setting `Max sessions per user = 30` | Actual restoration/override note is owned by TASK-359-05; TASK-360-07 verifies final evidence. |

## Refinement Checklist

28. **Coverage matrix:** maintain a cross-report matrix mapping every finding in
    the six reports to exactly one owner task and, when relevant, one shared
    contract. No finding may be left as "covered by summary" only.
29. **Gate naming:** if new tests become release gates, update the owning script,
    workflow, and `_docs/CODERSO_RELEASE_GATES.md` in the same implementation
    task.
30. **Claude evidence labeling:** final reports must distinguish Claude source
    review from actual Claude UI clicking; do not imply Claude clicked UI unless
    the run completed and produced UI evidence.
31. **Shared component migration:** shared `ConfirmActionDialog` and
    `ExportDialog` changes must include a migration audit of all existing
    callsites, not only the six audited reports.
32. **Regression fixture isolation:** all Playwright fixtures must use unique
    names/emails and clean only their own records; no broad table truncation.
33. **No-op prevention policy:** add contributor guidance that active controls
    must have real handlers or explicit disabled/unavailable state before
    merging.
34. **Stable control locators:** Radix Selects and icon-only controls in audited
    Admin surfaces need stable accessible names and/or test ids where their
    current accessible name is brittle.
35. **Filter-label truthfulness:** shared query conventions must require filter
    labels to match their actual data source, e.g. Access Logs cannot label a
    static role dropdown as `User`.
36. **Stable control locators:** TASK-360-04/TASK-360-05 must promote the audit
    finding about brittle Radix Selects and icon-only controls into explicit
    acceptance criteria for accessible names and/or stable test ids.

## Sub-Tasks

Physical execution leaves:

- `TASK-360-01_Admin_Permission_Snapshot_Contract.md`
- `TASK-360-02_Shared_Confirm_Action_Pattern.md`
- `TASK-360-03_Shared_Export_Dialog_Contract.md`
- `TASK-360-04_Admin_No_Op_Control_Audit_Gate.md`
- `TASK-360-05_Drawer_and_Sheet_Accessibility_Gate.md`
- `TASK-360-06_Admin_Server_Side_Query_and_Pagination_Conventions.md`
- `TASK-360-07_Final_Evidence_Reports_and_QA_Closure.md`

## Implementation Order

1. Land `TASK-360-01` permission snapshot before TASK-355, TASK-356, and
   TASK-359 consume it.
2. Land `TASK-360-02` confirm pattern before area-specific destructive action
   confirmations.
3. Land `TASK-360-03` export dialog contract before TASK-357 and TASK-358
   exports.
4. Add no-op/a11y/query gates after the first area implementations prove the
   shared shape.
5. Use `TASK-360-07` only after TASK-355 through TASK-359 implementation work
   has landed and can be re-audited end to end.

### TASK-360-01: Admin Permission Snapshot Contract

**Status:** To Do

Own the shared contract that area tasks consume:

- Define `AuthUser.permissions` or equivalent effective-permission payload.
- Provide a stable `can(permission)` helper/hook.
- Make route/menu/component gating consistent.
- Keep API 403 as defense-in-depth.
- Add tests proving unknown/missing permission payload fails closed.

Pseudocode:

```ts
type AdminPermissionSnapshot = {
  permissions: string[];
  roles: Array<{ id: string; slug: string; name: string }>;
};

function canAdmin(permission: string, snapshot: AdminPermissionSnapshot | null) {
  if (!snapshot) return false;
  return snapshot.permissions.includes("*") || snapshot.permissions.includes(permission);
}

function useAdminCan() {
  const auth = useAdminAuth();
  return useCallback((permission: string) => canAdmin(permission, auth.user?.permissionSnapshot ?? null), [auth.user]);
}
```

Acceptance for this sub-task:

- `Users`, `Roles Matrix`, and `Settings` can consume one shared permission
  contract.
- Sidebar route links are hidden/disabled through the same helper.
- Route guards do not duplicate permission string logic ad hoc.

### TASK-360-02: Shared Confirm Action Pattern

**Status:** To Do

Own a reusable pattern for destructive and lockout-prone Admin actions.

Required API:

```tsx
type ConfirmAction = {
  title: string;
  description: string;
  targetLabel?: string;
  confirmLabel: string;
  variant: "destructive" | "warning";
  requireTypedValue?: string;
  onConfirm: () => Promise<void>;
};
```

Required behavior:

- Cancel never calls `onConfirm`.
- Confirm handles loading/error.
- Typed confirmation available for delete/full-access/lockout actions.
- Accessibility: dialog title/description always present.
- Redacted audit event hook required for audited destructive/high-risk domains
  that already have an audit trail; domains without audit support must document
  the gap in the area task before implementation.

Area adoption:

- Users delete/deactivate/delete role.
- Roles full access and mass save.
- Access Logs revoke.
- Settings sessions/API keys/webhooks/IP allowlist/security changes.

### TASK-360-03: Shared Export Dialog Contract

**Status:** To Do

Replace the close-only shared `ExportDialog` with a real contract:

- `onExport(payload)` required for enabled submit.
- Dialog validates format and selected fields.
- Loading/success/error states.
- Optional disabled mode with explicit unavailable text.
- Export payload includes source surface, active filters, selected fields, and
  format.

Pseudocode:

```tsx
type ExportDialogPayload = {
  format: "csv" | "json";
  fields: string[];
};

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ExportField[];
  onExport?: (payload: ExportDialogPayload) => Promise<void>;
  unavailableReason?: string;
};

function canSubmitExport(props: ExportDialogProps, selectedFields: string[]) {
  return Boolean(props.onExport) && selectedFields.length > 0 && !props.unavailableReason;
}

async function downloadAdminExport(
  apiPath: `/${string}`,
  payload: unknown,
  options: { filenamePrefix: string; withCsrf: true }
) {
  // Resolve through the same admin API base convention as apiRequest, then
  // handle JSON export content/metadata or async export-job JSON.
  return resolveExportDownload(
    await adminApiFetch(apiPath, {
      method: "POST",
      body: JSON.stringify(payload),
      withCsrf: options.withCsrf,
      accept: "json-export-or-job",
    }),
    options.filenamePrefix
  );
}
```

Area adoption:

- Audit Logs export.
- Access Logs export.
- Any existing import/export surface using this component must remain backward
  compatible or be migrated in the same PR.
- Remove or disable the current active `xlsx` option unless an adopting task
  implements a real Excel export route/content type and tests.

### TASK-360-04: Admin No-Op Control Audit Gate

**Status:** To Do

Create a repeatable test/review gate so active-looking controls cannot silently
ship without handlers.

Implementation shape:

- Prefer targeted component tests over brittle global DOM scanning.
- Add a report-driven checklist test for known fixed controls:
  - Users `Reset password`,
  - Users filter icon,
  - Users `Email notifications` switches,
  - Access Logs `Revoke access`,
  - Access Logs `View full session`,
  - Access Logs sliders/advanced filters button,
  - Audit actions,
  - Storage `Test Connection`,
  - Email `Export Logs`,
  - General logo/favicon/timezone,
  - Site Performance,
  - Sessions link-buttons,
  - Login Alerts placeholder controls.
- For controls intentionally not implemented, assert they are disabled,
  hidden, or expose unavailable copy.

Pseudocode:

```ts
type ControlExpectation =
  | { name: string; expected: "has-handler" }
  | { name: string; expected: "disabled"; reasonPattern: RegExp }
  | { name: string; expected: "hidden" };
```

Validation:

- Add this gate to a relevant admin UI test command and release-gate docs if it
  becomes part of `gates:coderso`.

### TASK-360-05: Drawer and Sheet Accessibility Gate

**Status:** To Do

- Add a Playwright/Vitest assertion that opening the audited admin drawers does
  not produce Radix missing title/description warnings.
- Cover:
  - mobile user details sheet,
  - Audit details drawer,
  - Access Log details drawer,
  - IP allowlist drawer,
  - webhook drawer,
  - email logs drawer,
  - integrations drawer,
  - any shared drawer touched by area tasks.

Pseudocode:

```ts
async function expectNoRadixDialogDescriptionWarnings(openDrawer: () => Promise<void>) {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  await openDrawer();
  expect(warnings.filter((text) => text.includes("DialogContent"))).toEqual([]);
}
```

### TASK-360-06: Admin Server-Side Query and Pagination Conventions

**Status:** To Do

Own shared conventions used by TASK-357 and TASK-358:

- strict query schemas,
- clamped limits,
- cursor metadata,
- date boundary normalization,
- active filter reset behavior,
- user-facing count copy rules.

Required conventions:

- Never render fake totals.
- Never show active pagination buttons without matching state.
- `custom` date ranges must have actual inputs.
- Unknown query fields rejected at route boundary.
- Filter labels must match the real query field. A role-backed filter is
  labelled "Role"; a user-backed filter is labelled "User"; mixed text filters
  are labelled "Query" or "Actor".

Pseudocode:

```ts
type AdminQueryField =
  | { kind: "query"; label: "Query"; value: string }
  | { kind: "user"; label: "User"; userId: string }
  | { kind: "role"; label: "Role"; roleId: string }
  | { kind: "dateRange"; label: "Date range"; from: string; to: string };

function assertFilterLabelMatchesSource(field: AdminQueryField) {
  if (field.kind === "role" && field.label !== "Role") {
    throw new Error("admin_filter_label_mismatch");
  }
  if (field.kind === "user" && field.label !== "User") {
    throw new Error("admin_filter_label_mismatch");
  }
}

function buildCursorPageState<TQuery>(query: TQuery, response: CursorResponse) {
  return {
    query,
    rows: response.items,
    nextCursor: response.nextCursor ?? null,
    countCopy: resolveTruthfulCountCopy(response),
  };
}
```

Data flow:

1. Surface owns strict filter state with typed source labels.
2. Query serializer rejects label/source mismatches in tests.
3. Server validates query params and returns cursor metadata.
4. UI renders count copy only from metadata.

Error handling:

- Invalid custom date range blocks submit locally and maps server
  `*_query_invalid` to field errors.
- Invalid/expired cursor resets to first page with non-destructive copy.
- Unknown query params map through centralized `map*Error` helpers.

### TASK-360-07: Final Evidence, Reports, and QA Closure

**Status:** To Do

After TASK-355 through TASK-359 land:

- Re-run the full Admin UI Playwright audit over Users, Roles Matrix, Audit
  Logs, Access Logs, and Settings.
- Use a controlled role/user fixture like the 2026-06-01 audit:
  - create role,
  - create login-capable test user through supported UI,
  - restricted login,
  - negative write attempts blocked at UI,
  - backend 403 defense-in-depth still covered,
  - cleanup via UI.
- Update all six reports with final evidence.
- Verify that `TASK-359-05` restored or explicitly documented
  `Max sessions per user` from the QA value of 30.
- Run Claude/source review after implementation and record whether it clicked
  UI or only reviewed source.

Pseudocode:

```ts
type AdminAuditFindingStatus =
  | { status: "fixed"; evidence: string[] }
  | { status: "disabled"; evidence: string[]; unavailableCopy: string }
  | { status: "deferred"; owner: string; date: string; reason: string };

function assertEveryFindingClosed(matrix: Record<string, AdminAuditFindingStatus>) {
  for (const [findingId, status] of Object.entries(matrix)) {
    if (status.status === "deferred" && (!status.owner || !status.date)) {
      throw new Error(`Finding ${findingId} deferred without owner/date`);
    }
    if (status.status !== "deferred" && status.evidence.length === 0) {
      throw new Error(`Finding ${findingId} closed without evidence`);
    }
  }
}
```

Data flow:

1. Build a six-report finding matrix before final re-audit.
2. Re-run Playwright over each area using isolated fixtures.
3. Attach code/test/report evidence to each matrix row.
4. Run Claude/source review and label whether it is source-only or UI-clicking.
5. Update reports, changelogs, task board, and release-gate docs.

Error handling:

- If any finding lacks evidence, keep TASK-360 open.
- If Claude UI clicking times out, record source-only result and do not claim
  Claude clicked UI.
- If DB/network blocks Playwright, record blocker and rerun before closure.

## Security Contract

This task owns shared Admin UI contracts and may touch auth/bootstrap, export,
query, and confirm patterns.

- Endpoint visibility: internal admin only for all shared Admin API changes.
- Auth model: authenticated admin session.
- RBAC: permission snapshot must represent effective backend permissions and
  fail closed when absent/stale.
- CSRF: required for all write/export/revoke/test actions.
- Rate-limit bucket: `admin_read`, `admin_write`, `auth`, and `assistant`
  depending on route family:
  - `admin_read` for read/query routes,
  - `admin_write` for mutations, exports, revoke, settings tests, API-key, IP
    allowlist, and admin security actions,
  - `auth` for public auth/reset routes,
  - `assistant` for assistant action/reindex endpoints that already use the
    assistant route family.
  A new security-sensitive bucket requires `_docs/SECURITY_SPEC.md`, runtime
  bucket selection, tests, and gate updates before any task may depend on it.
- Reject unknown validation: every new/changed route body/query strict and
  schema-first.
- Anti-abuse: no public write endpoint in this family. If any public endpoint
  appears during implementation, it must use nonce + signature/HMAC and the
  existing public-write hardening pattern, not an ad hoc flow.
- Secret handling: permission snapshots and UI debug payloads must not expose
  secrets, tokens, cookies, API keys, SMTP/storage credentials, or reset tokens.
- Audit: shared export, permission, destructive, and lockout-prone actions must
  emit redacted audit events where the domain has an audit trail.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest UI tests for shared permission hook, confirm dialog, export
  dialog, no-op control expectations, and drawer a11y warnings.
- Bun route/service tests for permission snapshot and shared query/export
  contracts when backend routes change.
- Full Admin Playwright audit rerun after area tasks land.
- `bun run gates:coderso` when release-gated auth/RBAC/security/perf behavior
  changes.
- Security scanner commands from `_docs/SECURITY_SPEC.md` if auth,
  secret-handling, public-write, dependency, or scanner config changes are
  touched.

## Documentation Updates Required

- All six reports in `_docs/PLAYWRIGHT/31-05-2026-admin/`
- `_docs/PLAYWRIGHT/31-05-2026-admin/README.md`
- `_docs/AUTH_SPEC.md`
- `_docs/RBAC_SPEC.md`
- `_docs/AUDIT_SPEC.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_RELEASE_GATES.md` if gates change.
- `CONTRIBUTING.md` and/or `docs/develop/contributing.md` for no-op control
  prevention policy if contributor guidance changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1050-2026-06-01-task-360-admin-ui-cross-cutting-remediation-family.md`

## Acceptance Criteria

- TASK-355 through TASK-359 can implement area fixes against shared contracts
  instead of inventing one-off patterns.
- No active no-op controls remain in the audited Admin surfaces.
- No restricted user reaches write-submit UI for forbidden Users/Roles/Settings
  actions.
- All destructive/high-risk actions have confirm or are disabled.
- Drawer/sheet warning gate is green.
- Audit/access export and pagination are truthful.
- Final reports are updated with live Playwright evidence, source review, and
  validation commands.
- The final closure can prove all six report findings are either fixed,
  intentionally disabled with tests, or explicitly deferred with owner/date.
