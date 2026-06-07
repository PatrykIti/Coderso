# 1121 - TASK-407 intake UI state machine

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-06-L01

## Key Changes

### Assistant Admin UI
- Added an explicit site-builder intake UI reducer for idle, restored,
  answering, review, planning, ready-plan, dry-run, executing, completed,
  cancel, reset, stale-cache, and error states.
- Made server-normalized intake sessions authoritative over dirty local reducer
  state so stale browser snapshots cannot overwrite backend truth.
- Kept browser restore bounded to the redacted session snapshot and excluded raw
  answers, provider text, secrets, signed URLs, upload bytes, and auth material.
- Gated planning behind confirmed review, dry-run behind a strict ready plan,
  and execute behind a strict plan that has completed dry-run.

### QA
- Added focused Vitest coverage for reducer transitions, stale-cache discard,
  server rehydration, and pre-plan dry-run/execute blocking.
- Re-ran existing AI site wizard and floating assistant panel UI tests to catch
  regressions in docs/action-plan surfaces.

## Validation

- `bun run test:vitest -- tests/vitest/ui/assistant-site-builder-intake-state.test.ts tests/vitest/ui/assistant-site-builder-intake-browser-state.test.ts`
  (6 tests)
- `bun run test:vitest -- tests/vitest/ui/ai-site-wizard.test.tsx tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
  (30 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
