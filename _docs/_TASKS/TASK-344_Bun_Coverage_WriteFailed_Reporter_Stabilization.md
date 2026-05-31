# TASK-344: Bun Coverage WriteFailed Reporter Stabilization
# FileName: TASK-344_Bun_Coverage_WriteFailed_Reporter_Stabilization.md

**Priority:** High
**Category:** CI + Testing + Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-102-03, TASK-104-06, TASK-230
**Status:** Done (2026-05-31)

---

## Overview

Stabilize the GitHub Actions `bun-lane` coverage step after `bun run
test:coverage:bun` failed with Bun's internal `WriteFailed` while streaming the
large per-file text coverage table.

The visible `core/widgets/core/stack.tsx` line is a coverage-table row, not the
root failure. The actual issue is the reporter path writing a very large table
to stdout after the tests have already passed.

## Sub-Tasks

- Reproduce the failure locally with `bun run test:coverage:bun`.
- Keep the curated Bun-owned lane and `coverage/bun/lcov.info` artifact.
- Stop streaming the full Bun `text` coverage reporter into CI logs.
- Print a compact LCOV-derived summary after the coverage artifact is written.
- Add focused helper coverage for LCOV parsing/formatting.
- Update testing docs, task board, and changelog.

## Implementation Pseudocode

```ts
await rm("coverage/bun", { recursive: true, force: true });
await bunTest([
  "--coverage",
  "--coverage-reporter=lcov",
  "--coverage-dir=coverage/bun",
  "--reporter=dots",
  ...laneSuites,
]);

const totals = summarizeLcov(await readFile("coverage/bun/lcov.info", "utf8"));
console.log(formatBunLaneCoverageSummary(totals));
```

Data flow:

- `scripts/run-bun-lane.ts` remains the lane owner and keeps the same curated
  route/plugin/perf suite selection.
- `scripts/bun-lane-coverage.ts` owns pure LCOV summary parsing/formatting.
- `tests/vitest/tooling/bun-lane-coverage.test.ts` validates the pure helper in
  the Vitest lane.

Error handling:

- Missing or invalid `coverage/bun/lcov.info` fails the wrapper through the
  normal file read/stat error path after the test process exits.
- Test failures still return the Bun test exit code before summary printing.

## Security Contract

No API routes are added or changed.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: coverage output remains local CI/test artifacts only.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/tooling/bun-lane-coverage.test.ts`
- `bun run test:coverage:bun`
- `bun run test:bun:lane`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`

## Documentation Updates Required

- `tests/README.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1031-2026-05-31-bun-coverage-writefailed-stabilization.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-05-31)

- Reproduced the local failure: all selected Bun lane tests passed, then Bun
  exited with internal `WriteFailed` while printing the long coverage table.
- `test:coverage:bun` now writes LCOV and prints a compact summary instead of
  streaming Bun's full per-file text coverage table.
- Validation passed:
  - `bun run vitest run --config vitest.config.ts tests/vitest/tooling/bun-lane-coverage.test.ts`
  - `bun run test:coverage:bun` (`116 pass`, `0 fail`, compact LCOV summary printed)
  - `bun run test:bun:lane` (`116 pass`, `0 fail`)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run lint:repo:types`
