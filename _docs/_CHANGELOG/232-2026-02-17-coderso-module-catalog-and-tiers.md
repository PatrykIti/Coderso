# 232-2026-02-17 - Coderso module catalog and tiers

Date: 2026-02-17
Version: Unreleased
Tasks: TASK-054-06

## Key Changes
- Admin/UI: Added a formal `CODERSO_MODULE_REGISTRY` with v1/v2/v3 tiers, owner areas, lifecycle states, and module dependencies.
- Admin/UI: Sidebar Coderso group now renders from registry using `buildCodersoNavItems(flags)` instead of hardcoded items.
- Admin/UI: Added `buildDefaultNavSections(flags)` so future Coderso modules can be toggled by feature flags without rewriting nav config.
- Tests: Added unit coverage for registry size/tier distribution and feature-flagged nav item generation.
- Docs: Added `_docs/CODERSO_MODULES.md` and updated `_docs/ARCHITECTURE.md` + `_docs/ADMIN_NAVIGATION.md` with catalog and rollout contract.
