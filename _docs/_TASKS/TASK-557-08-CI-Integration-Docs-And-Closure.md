# TASK-557-08: CI Integration, Docs, and Closure
# FileName: TASK-557-08-CI-Integration-Docs-And-Closure.md
**Parent Task:** TASK-557
**Priority:** High
**Category:** CI / Documentation / Task Board
**Estimated Effort:** Medium
**Dependencies:** TASK-557-05, TASK-557-06 (runner green)
**Status:** ⏳ To Do
---
## Overview
Wire the new parallel runner into CI (`coderso-pr-gates.yml` bun-lane job) and
the local command surface, fix the `run-bun-lane.ts` `canRunSuite` double-run
(~2x CI DB execution), document the new architecture, write changelog 1271,
and close the family on the board. The bun-lane CI job must receive
`DATABASE_DIRECT_URL` (new secret/variable) in addition to `DATABASE_URL`, and
must run on a runner with enough CPU for `--workers` (CI `ubuntu-latest` = 4
vCPU; default K=4 in CI unless the workflow overrides).

## Sub-Tasks
- TASK-557-08-L01: CI workflow wiring + canRunSuite fix
- TASK-557-08-L02: Docs, changelog, board, and family closure

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green; full
  `bun run test:bun` green via the new runner; `bun run test:vitest`,
  `bun run precommit:check`, `bun run gates:coderso` green.
- CI workflow YAML is valid (actionlint or `bunx action-validator` if
  available); the lane job includes `DATABASE_DIRECT_URL`.
- Record final wall time of the new lane (local and/or CI) in changelog 1271.

## Documentation Updates Required
- `tests/README.md`, `_docs/TESTING_STRATEGY.md`, `_docs/_CHANGELOG/README.md`,
  `_docs/_TASKS/README.md` — see leaves.
