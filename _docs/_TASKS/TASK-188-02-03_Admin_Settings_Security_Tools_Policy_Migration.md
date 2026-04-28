# TASK-188-02-03: Admin Settings Security Tools Policy Migration
# FileName: TASK-188-02-03_Admin_Settings_Security_Tools_Policy_Migration.md

**Priority:** High
**Category:** Assistant/Core + Admin Surface Policy
**Estimated Effort:** Medium
**Dependencies:** TASK-188-01, TASK-188-02
**Status:** Done (2026-04-19)

---

## Overview

Move admin/security/tool surfaces into policy as read-only or gated surfaces.

## Sub-Tasks

No child task files.

## Policy Entries

- Dashboard
- Search
- SEO Manager
- Analytics
- Backups
- Import / Export
- Redirects
- Users
- Roles Matrix
- Audit Logs
- Access Logs
- Settings root and settings subpages:
  - General
  - Assistant
  - Site
  - Security
  - API Keys
  - Webhooks
  - Email
  - Storage
  - Integrations

## Pseudocode

```ts
settingsSurfacePolicy({
  kind: "settings-surface",
  routes: ["/admin/settings/api-keys"],
  operations: ["inspect"],
  mutationPolicy: "gated",
  secrets: { redacted: true, forbiddenPromptValues: ["apiKey", "smtp.password"] },
});
```

## Security Contract

- Visibility: internal policy data.
- RBAC: settings/security permissions reflected.
- Reject-unknown validation: no settings mutation unless typed contract exists.
- Anti-abuse: privilege escalation/import/restore prompts gated.
- Secret handling: all secret-bearing settings marked redacted.

## Testing Requirements

- Policy coverage for every settings/admin/tool route.
- Secret-bearing surfaces have `secrets.redacted=true`.
- Live matrix coverage remains mapped.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/SETTINGS.md`
- changelog on completion

## Completion Notes (2026-04-19)

- Added `adminSurfacePolicies.ts` with policy entries for Dashboard, Menus, Search, SEO, Analytics, Backups, Import/Export, Redirects, Users, Roles, Audit Logs, Access Logs, and Settings subpages.
- Marked sensitive settings/admin/tool mutations as gated and secret-bearing surfaces as redacted with provider access disabled.
- Preserved executable Menus and SEO policy entries because TASK-188-02 still requires all current live matrix routes to be represented.
- Extended the assistant policy aggregate and Vitest coverage for route-to-matrix mapping, settings sidebar coverage, gated actions, redacted surfaces, and Menus/SEO typed actions.
- No runtime planner/resolver behavior was changed in this leaf.

## Validation (2026-04-19)

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/operation-policy-schema.test.ts tests/vitest/assistant/operation-policy-lookup.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
