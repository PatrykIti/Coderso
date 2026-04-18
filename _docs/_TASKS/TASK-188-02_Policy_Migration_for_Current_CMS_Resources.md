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

No child task files.

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
