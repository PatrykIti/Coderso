# 1298 - TASK-576 Workflow Surface Repair And Gate Re Green

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-576

## Key Changes

### Workflows / Toolchain
- Non-canonical/legacy `.mjs` workflow scripts moved into an explicit
  `_docs/_workflows/_archive/` directory outside the executable glob;
  inventory/glob references updated and every moved file recorded in the
  disposition matrix.
- Syntax-invalid workflow files repaired or archived; `node --check` re-run
  over the canonical inventory.
- Forbidden directives (pinned-changelog/commit violations) stripped from the
  tracked workflow scripts; changelog numbers pinned per stream.
- Tests split by cohesive responsibility; `taskGraphIntegrity` inventory gets
  the memoization/timeout fix that was causing false failures.

## Validation
- `bun --cwd core lint` + `lint:types` green; workflow static-contract
  suites (`workflowStaticContract.test.ts` family) green again; all
  workflow-surface gates re-green (92/92 smoke-evidence suites).
