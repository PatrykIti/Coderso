# 772 - TASK-054 Modular Admin IA Closure and Portal/i18n Split

- Date: 2026-04-29
- Version: Unreleased
- Tasks: TASK-054, TASK-054-20, TASK-054-21, TASK-239, TASK-240

## Key Changes

### Admin IA

- Closed TASK-054 as the delivered Advanced admin IA contract: canonical
  `/admin/advanced/*` routes, preserved `/admin/coderso/*` compatibility
  aliases, and Coderso as the product brand rather than the technical module
  group name.
- Updated architecture/cache documentation to describe the current Advanced
  sidebar/module terminology.

### Task Split

- Closed `TASK-054-20` as superseded and replaced it with
  `TASK-239_Coderso_Membership_and_Client_Portal_Umbrella.md`.
- Closed `TASK-054-21` as superseded and replaced it with
  `TASK-240_Coderso_Multilingual_and_i18n_Umbrella.md`.
- Added TASK-239 and TASK-240 to the kanban To Do column as execution-ready
  umbrella tasks with explicit architecture, implementation order, pseudocode,
  security contracts, testing lanes, documentation updates, and acceptance
  criteria.

## Validation

- Documentation-only closure and task split.
- Board statistics and status rows were updated with TASK-054/TASK-220/TASK-238
  closure plus TASK-239/TASK-240 To Do insertion.
