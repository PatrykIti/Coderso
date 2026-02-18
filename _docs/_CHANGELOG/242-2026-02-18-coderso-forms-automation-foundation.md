# 242-2026-02-18 - Coderso forms automation foundation

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-09

## Key Changes
- DB Schema: Added `form_actions` and `form_action_runs` tables with migration `0039_forms_automation_actions.sql` (plus snapshot/journal updates).
- Actions Contract: Added typed form automation contract (`formActionsContract`) with deterministic validation for:
  - action types `email`, `webhook`, `entry_sync`, `redirect`, `success_message`,
  - condition operators `always`, `equals`, `not_equals`, `exists`, `not_exists`.
- Automation Runner: Added `formAutomationRunner` with sequential execution, conditional skipping, continue-on-error control, run logging, and retry support from failed snapshots.
- Action Service Layer: Added `formActionsService` for action CRUD, run log persistence, and attempt sequencing.
- API Routes: Added form automation endpoints:
  - `GET/PUT /forms/:id/actions`,
  - `GET /forms/:id/action-runs`,
  - `POST /forms/action-runs/:runId/retry`.
- Submission Integration: `POST /forms/:id/submissions` now executes automation pipeline after submission persistence and returns runtime fallback payload (`successMessage`, `redirectUrl`).
- Admin UI: Added `Automation` tab in `FormBuilderPage` via new `FormActionsPanel` and dedicated `FormActionLogsPage` with retry action.
- Admin Cache: Added forms automation cache keys (`forms:actions:<id>`, `forms:action-runs:<id>`) and map/docs updates.
- Tests: Added unit/integration/UI tests for action contract, runner behavior, routes wiring, client API, and forms automation screens.
