# 359. TASK-102 Vitest Bootstrap

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-102, TASK-102-02, TASK-102-03

## Key Changes

### QA / Testing

- Added the first dedicated Vitest lane with `vitest.config.ts`.
- Added root scripts for `test:vitest`, `test:coverage`, `test:bun`, and split unit execution by runner.
- Introduced initial pilot suites in `tests/vitest/` for Bun-free code paths:
  - admin path normalization,
  - shared admin class utility,
  - SDK export contract.

### Coverage

- Added V8-based Vitest coverage output under `coverage/vitest`.
- Scoped initial source-wide coverage to Bun-free pilot areas:
  - `core/admin/lib/**`
  - `core/admin/utils/**`
  - `packages/sdk/src/**`

### Validation

- Verified:
  - `bun run test:vitest`
  - `bun run test:coverage`
  - `bun test tests/unit/ui/utils.test.ts tests/unit/admin/adminPaths.test.ts tests/unit/sdk/exports.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

- Observed existing unrelated failures in broad `bun run test:unit:bun`:
  - `core/db/client.ts` throws when `DATABASE_URL` is not set for some assistant-related suites,
  - `core/services/assistant/assistantService.ts` has an existing initialization error in the Bun unit lane.
