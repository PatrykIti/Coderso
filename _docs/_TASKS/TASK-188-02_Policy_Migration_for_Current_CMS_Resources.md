# TASK-188-02: Policy Migration for Current CMS Resources
# FileName: TASK-188-02_Policy_Migration_for_Current_CMS_Resources.md

**Priority:** High
**Category:** Assistant/Core + CMS Resource Policy
**Estimated Effort:** Large
**Dependencies:** TASK-188-01
**Status:** To Do

---

## Overview

Migrate current CMS/Admin resources into the new `assistantOperationPolicy`.

## Sub-Tasks

- `TASK-188-02-01_Pages_Forms_Listings_Policy_Migration.md`
- `TASK-188-02-02_Content_Screens_Widgets_Media_Policy_Migration.md`
- `TASK-188-02-03_Admin_Settings_Security_Tools_Policy_Migration.md`
- `TASK-188-02-04_Coderso_Planned_and_Gated_Modules_Policy_Migration.md`

## Resources to Cover

- Pages
- Posts
- Media
- Content Types / Engine
- Entries
- Custom Screens
- Widgets / Widget Templates
- Forms
- Listings
- Menus
- SEO
- Booking
- Reviews
- Commerce
- Popups
- Solution Kits
- Dashboard
- Store
- Themes
- Tools
- Users/Roles/Audit/Access Logs
- Settings
- planned/disabled Coderso modules

## New Files

- `core/services/assistant/operationPolicy/assistantOperationPolicy.ts`
- `core/services/assistant/operationPolicy/cmsResourcePolicies.ts`
- `core/services/assistant/operationPolicy/adminSurfacePolicies.ts`
- `tests/vitest/assistant/operation-policy-coverage.test.ts`

## Migration Map

- Move from `cmsResourceRegistry.ts`:
  - aliases,
  - supported operations,
  - read permissions.
- Move from `cmsTargetResolver.ts`:
  - `published/opublikowane` filters,
  - `publiczny/internal` filters,
  - custom screen `published -> active`,
  - surface-only read terms.
- Move from `actionPlannerService.ts`:
  - post/media/settings gated-surface rules,
  - provider local-first route hints,
  - layout/limit field-intent repairs.
- Move from `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`:
  - route coverage state and task owner.

## Pseudocode

```ts
export const assistantOperationPolicy = defineAssistantOperationPolicy({
  schemaVersion: 1,
  resources: {
    page: pagePolicy,
    form: formPolicy,
    "custom-screen": customScreenPolicy,
    "settings-surface": settingsPolicy,
  },
  followUp: commonFollowUpPolicy,
  safetyDefaults: defaultSafetyPolicy,
});
```

## Replacement Notes

Do not delete `cmsResourceRegistry.ts` yet. Add compatibility tests proving policy data equals current registry behavior before switching consumers.

## Acceptance Criteria

1. All routes in `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` have policy entries.
2. Existing `cmsResourceRegistry` aliases are represented in policy.
3. Unsupported/planned surfaces are explicitly `gated` or `not-applicable`.
4. Policy can drive the live coverage map.

## Security Contract

- Visibility: internal policy data.
- Auth model: no runtime change.
- RBAC: permission metadata must mirror existing route/action contracts.
- CSRF: no runtime change.
- Rate-limit bucket: no runtime change.
- Reject-unknown validation: route/resource ids must be canonical.
- Anti-abuse: unsupported surfaces cannot claim executable action support.
- Secret handling: secret-bearing settings/integrations must be marked.

## Testing Requirements

- Static policy coverage test against:
  - `sidebarConfig.ts`
  - `codersoModules.ts`
  - `SettingsSidebar.tsx`
  - action registry.
- Validation:
  - targeted Vitest policy coverage tests.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- changelog on completion
