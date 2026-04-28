# 651. TASK-178 generic CMS planner foundation

Date: 2026-04-16
Version: unreleased
Tasks: TASK-178-01, TASK-178-02, TASK-178-04

## Key Changes

### Assistant/Core

- Added a strict generic CMS operation draft schema for `LLM Guide`.
- Added a CMS resource registry with aliases, supported operations, and read-permission metadata.
- Added generic target resolution for exact, prefix, candidate, no-match, ambiguous, and unsupported outcomes.
- Extended assistant resource catalog snapshots with bounded page summaries.

### Admin/UI

- Added read-only CMS inspection plan metadata.
- Updated the action review UI to render CMS resource candidates and hide dry-run/execute controls when a plan has no actions.
- Zero-action dry-runs are no longer executable.

### Validation

- Added Vitest coverage for operation draft schema, registry aliasing, target resolution, strict inspection plans, planner behavior, resource catalog page summaries, and read-only UI rendering.
- Revalidated assistant executor and route tests.
