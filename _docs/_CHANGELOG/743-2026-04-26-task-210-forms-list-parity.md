# 743 - TASK-210 Forms List Parity

Date: 2026-04-26
Version: unreleased
Tasks: TASK-210, TASK-210-01, TASK-210-02, TASK-210-03, TASK-210-04, TASK-210-05, TASK-210-06, TASK-210-07

## Key Changes

### Forms Admin UI
- Rebuilt `/admin/coderso/forms` around the Pages list contract: canonical route state, cached hydration, filters, checkbox selection, shared pagination, row actions, bulk actions, confirmation dialogs, and shared list-action toasts.
- Added Forms-specific row and bulk lifecycle actions for publish, move to draft, archive, and delete without adding out-of-contract Preview, Duplicate, or Embed Code flows.
- Updated the Forms create drawer with compact `New`, reset-on-open behavior, accessible sheet description, list payload guards, null-create fallback, and `forms.openAfterCreate`.

### Forms API Contract
- Added a pure Forms status contract for shared enum ownership and tightened create/update schema validation to `draft | published | archived`.
- Added centralized Forms error mapping for stable machine-readable API failures, including `form_delete_restricted`.
- Added a retained-history hard-delete precheck so forms with submissions or action diagnostics return a stable conflict and can be preserved through Archive.

### Docs and QA
- Updated Forms list/cache/navigation/API/product docs, source QA notes, task board, and changelog index.
- Validated with targeted Vitest UI/admin suites, lint, typecheck, DB-backed Bun route/service/settings suites outside sandbox, and public submission hardening tests.
- Attempted `bun run gates:coderso` outside sandbox with repo env; the gate is currently blocked by stale Functional UI smoke paths under `tests/unit/ui/*` while the matching suites live under `tests/vitest/ui/*`.
