# 832 - TASK-190 legacy custom screen reuse fallback

Date: 2026-05-10
Version: Unreleased
Tasks: TASK-190, TASK-190-07, TASK-190-08

## Key Changes

### Assistant/Core
- Extended custom-screen `upsert` reuse so metadata-backed canonical screens are
  preferred, while legacy exact-name screens without `collectionRole` /
  `compositionKey` metadata are still reused and upgraded instead of duplicated.

### Validation
- Added Bun action executor regression coverage for legacy exact-name
  custom-screen reuse before metadata exists.
- Passed targeted Bun action executor coverage, `bun --cwd core lint`,
  `bun --cwd core lint:types`, `bun run lint`, full `bun run test:vitest`, full
  DB/runtime `bun run test:bun` outside the sandbox, and
  `bun run scan:security:strict`.
