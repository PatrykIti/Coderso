# 832 - TASK-190 legacy custom screen reuse fallback

Date: 2026-05-10
Version: Unreleased
Tasks: TASK-190, TASK-190-07, TASK-190-08

## Key Changes

### Assistant/Core
- Extended custom-screen `upsert` reuse so metadata-backed canonical screens are
  preferred, while legacy exact-name screens without `collectionRole` /
  `compositionKey` metadata are still reused and upgraded instead of duplicated.
- Same-name screens that already carry different composition metadata now stay
  protected by a dependency conflict instead of being overwritten by the fallback.

### Validation
- Added Bun action executor regression coverage for legacy exact-name
  custom-screen reuse before metadata exists and same-name conflicting metadata.
- Passed targeted Bun action executor coverage (`64` tests, `307` assertions),
  `bun --cwd core lint`, `bun --cwd core lint:types`, `bun run lint`, full
  `bun run test:vitest` (`582` files, `2611` tests), full DB/runtime
  `bun run test:bun` outside the sandbox (`758` tests, `2936` assertions), and
  `bun run scan:security:strict`.
