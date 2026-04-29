# TASK-220-02-02: Read-Only Dashboard, Audit, Security, and Settings Loaders
# FileName: TASK-220-02-02_Read_Only_Dashboard_Audit_Security_and_Settings_Loaders.md

**Priority:** High
**Category:** Admin/UI + Read Loaders
**Estimated Effort:** Large
**Dependencies:** TASK-220-02
**Status:** Done (2026-04-29)

---

## Overview

Refactor simple read-only admin pages whose mount effects call `refresh()` or
`loadSettings()` and synchronously set loading/error state. These pages should
initialize visible state from a deterministic initial snapshot and update after
the async read resolves.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|---|---|---|---|---|
| core/admin/ui/audit/AuditList.tsx | 162 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/backups/BackupsPage.tsx | 55 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/dashboard/DashboardPage.tsx | 54 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/kits/hooks/useSolutionKitRuns.ts | 70 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshRuns(true).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/kits/hooks/useSolutionKitRuns.ts | 98 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshRunDetail(selectedRunId).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/redirects/RedirectsPage.tsx | 57 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh()` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/roles/PermissionsMatrixPage.tsx | 121 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/security/AccessLogsPage.tsx | 167 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/ApiKeysPage.tsx | 61 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/EmailSettingsPage.tsx | 108 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void loadSettings();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/IntegrationsPage.tsx | 115 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/LoginAlertsPage.tsx | 63 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/SecuritySettingsPage.tsx | 436 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/SessionsPage.tsx | 121 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/StorageSettingsPage.tsx | 379 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/useIpAllowlist.ts | 40 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/WebhooksPage.tsx | 84 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/setup/SetupWizard.tsx | 57 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm(resolveInitialValues(initialValues));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Convert simple `useEffect(() => void refresh(), [refresh])` loaders to a
  compiler-safe load pattern.
- [ ] Preserve existing empty/error/loading UI copy and permissions.
- [ ] Keep settings form normalization schema-first and avoid browser-visible
  secret values.

## Files to Change

- `core/admin/ui/audit/AuditList.tsx`
- `core/admin/ui/backups/BackupsPage.tsx`
- `core/admin/ui/dashboard/DashboardPage.tsx`
- `core/admin/ui/redirects/RedirectsPage.tsx`
- `core/admin/ui/roles/PermissionsMatrixPage.tsx`
- `core/admin/ui/security/AccessLogsPage.tsx`
- `core/admin/ui/settings/ApiKeysPage.tsx`
- `core/admin/ui/settings/EmailSettingsPage.tsx`
- `core/admin/ui/settings/IntegrationsPage.tsx`
- `core/admin/ui/settings/LoginAlertsPage.tsx`
- `core/admin/ui/settings/SecuritySettingsPage.tsx`
- `core/admin/ui/settings/SessionsPage.tsx`
- `core/admin/ui/settings/StorageSettingsPage.tsx`
- `core/admin/ui/settings/WebhooksPage.tsx`
- `core/admin/ui/settings/useIpAllowlist.ts`
- `core/admin/ui/setup/SetupWizard.tsx`
- `core/admin/ui/kits/hooks/useSolutionKitRuns.ts`
- Existing nearest Vitest suites under `tests/vitest/ui/**` and
  `tests/vitest/admin/**`.

Ownership note: `useSolutionKitRuns` belongs to this read-loader leaf.
`useSolutionKits` is the cached list hook owned by TASK-220-03-01.

## Security Contract

- Visibility: internal admin read surfaces.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged; each backend read keeps current route/service permissions.
- CSRF: no new writes.
- Rate-limit bucket: existing admin read buckets.
- Reject-unknown validation: unchanged.
- Anti-abuse: avoid repeated mount refresh storms and preserve existing
  backend-side rate limits.
- Secret handling: settings pages must keep secrets redacted/backend-only.

## Pseudocode

```ts
const [state, setState] = useState<LoadState>(() => initialLoadState);

useEffect(() => {
  let active = true;
  void loadData().then(
    (data) => active && setState({ status: "ready", data }),
    (error) => active && setState({ status: "error", error: mapError(error) })
  );
  return () => {
    active = false;
  };
}, [loadData]);
```

## Testing Requirements

- Existing loader tests continue to see the same loading/error/ready states.
- Add focused tests when a page has no coverage and the refactor changes the
  visible loading sequence.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed read-only loader pages no longer trigger `set-state-in-effect`.
2. No settings secret becomes browser cached or visible in debug payloads.
3. Repeated route entry does not increase network reads compared with the current
   intended behavior.
