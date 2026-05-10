# 831 - TASK-190 post-review drift fixes

Date: 2026-05-10
Version: Unreleased
Tasks: TASK-190, TASK-190-06, TASK-190-07, TASK-190-08

## Key Changes

### Assistant/Core
- Fixed detail-template editor draft saves so published templates submit draft
  documents through the draft-only PATCH route before preview or republish.
- Fixed custom-screen `upsert` execution to reuse canonical collection screens
  by `collectionRole` / `compositionKey` metadata when editors have renamed the
  screen.
- Added detail-page `upsert` execution links to the manual Engine detail-template
  editor route.

### Documentation
- Clarified TASK-190 closure wording in the acceptance matrix, evaluation leaf,
  and security contract after the post-closure review pass.

### Validation
- Passed targeted Vitest detail-template/diagnostics/fixture suites, targeted
  Bun action executor coverage, `bun --cwd core lint`,
  `bun --cwd core lint:types`, `bun run lint`, full `bun run test:vitest`, full
  DB/runtime `bun run test:bun` outside the sandbox, and
  `bun run scan:security:strict`.
