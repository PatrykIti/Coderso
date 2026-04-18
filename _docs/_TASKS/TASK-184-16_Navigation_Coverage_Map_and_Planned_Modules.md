# TASK-184-16: Navigation Coverage Map and Planned Modules
# FileName: TASK-184-16_Navigation_Coverage_Map_and_Planned_Modules.md

**Priority:** High
**Category:** Assistant/QA + Navigation Coverage
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** To Do

---

## Overview

Create the source-of-truth map from Admin UI menu items to live assistant test coverage.

This leaf ensures TASK-184 cannot be closed while any visible Admin UI navigation item lacks an explicit live coverage status.

## Sub-Tasks

No child task files.

## Coverage Map Requirements

Map every item from:

- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/ui/navigation/codersoModules.ts`
- `core/admin/ui/settings/SettingsSidebar.tsx`

Coverage states:

- `live-execute`: live provider test creates/updates/deletes through typed actions.
- `live-read-only`: live provider test inspects/searches and verifies no mutation controls.
- `live-gated`: live provider test verifies unsupported/planned operation returns `needs_input` or gated plan.
- `not-applicable`: documented reason, usually disabled/planned nav item with no runtime route.

Planned/disabled modules must be included:

- Appointments
- Mega Menu
- Portal
- Multilingual/i18n

They should not silently disappear from the matrix. If their nav is disabled by default, live tests should verify assistant guidance remains gated or that route absence is documented.

## Files to Change

- New docs/source map, for example `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`.
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- TASK-184 docs and closure.

## Security Contract

- Visibility: docs/test coverage map.
- Auth model: no runtime change.
- RBAC: coverage map must record permission expectations per route family.
- CSRF: no runtime change.
- Rate-limit bucket: no runtime change.
- Reject-unknown validation: planned modules cannot claim executable coverage without strict action contracts.
- Anti-abuse: planned/disabled routes stay gated until implementation.
- Secret handling: coverage docs must not include secrets or test credentials.

## Testing Requirements

- A small static test should compare nav registry items to the coverage map.
- Failing condition:
  - new menu item appears without coverage status,
  - coverage entry references a removed route,
  - planned module marked executable without action contract.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- changelog on completion
