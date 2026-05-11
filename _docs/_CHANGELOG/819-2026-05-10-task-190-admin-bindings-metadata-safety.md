# 819 - TASK-190 admin bindings metadata safety

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-06, TASK-190-06-02

## Key Changes

### Admin binding composition

- Added `blueprintBindingComposer` for composing safe custom-screen bindings
  through the existing `widgetId + propPath + field + mode` contract.
- Catalog-family generated admin screens now use the shared binding composer,
  including missing-field checks, secret-like path rejection, and identical
  binding-id dedupe.

### Canonical screen metadata

- Added nullable `collectionRole` and `compositionKey` metadata to the
  top-level custom-screen contract and persisted it in `custom_screens`.
- Widened custom-screen route validation, service mapping, admin cached client
  normalization, assistant resource catalog summaries, and `custom-screen.*`
  assistant action execution so downstream workspace/no-duplicate leaves can
  consume the same owner seam.

### Docs and board

- Marked `TASK-190-06-02` done and updated the TASK-190 board counts.
- Updated assistant, API, architecture, security, and admin-cache docs for the
  custom-screen binding and metadata contract.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/blueprint-binding-composer.test.ts tests/vitest/assistant/blueprint-admin-surface-composer.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/admin/customScreensClient.test.ts tests/vitest/customScreens/customScreenService.test.ts`
- `set -a && source .env && set +a && bun test --parallel=1 tests/unit/assistant/actionExecutorService.test.ts`
- `set -a && source .env && set +a && bun run test:vitest` - 576 files
  passed, 2551 tests passed.
- `set -a && source .env && set +a && bun run test:bun` - 537 passed, 208
  skipped by the existing suite guards, 0 failed.
- `bun run db:migrate`
- `bun run lint`
- `bun run scan:security:strict` - passed outside the sandbox; the sandboxed
  attempt could not reach `bun audit` and Semgrep could not build its CA trust
  store.
- `git diff --check`
