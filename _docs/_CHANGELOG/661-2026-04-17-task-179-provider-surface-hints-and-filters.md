# 661. TASK-179 provider surface hints and filters

Date: 2026-04-17
Version: unreleased
Tasks: TASK-179-02, TASK-179-03

## Key Changes

### Assistant/Core

- Expanded provider operation draft guidance across CMS surfaces, not only Screens.
- Added resolver support for surface-aware read-only queries.
- Added custom-screen filter interpretation for active/published and visible/show-in-sidebar language.
- Added page published filter handling.

### Validation

- Added provider planning context assertions for broad CMS guidance.
- Added resolver tests for surface hints and custom-screen/page filters.
