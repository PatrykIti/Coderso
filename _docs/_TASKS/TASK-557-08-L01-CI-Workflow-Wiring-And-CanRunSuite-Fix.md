# TASK-557-08-L01: CI Workflow Wiring and canRunSuite Fix
# FileName: TASK-557-08-L01-CI-Workflow-Wiring-And-CanRunSuite-Fix.md
**Parent Subtask:** TASK-557-08
**Priority:** High
**Category:** CI
**Estimated Effort:** Small
**Dependencies:** TASK-557-05-L02 (runner), TASK-557-06-L01/L02 (lanes)
**Status:** ⏳ To Do
---
## Overview
Two CI changes:
1. `scripts/run-bun-lane.ts:86` `canRunSuite` currently spawns a FULL
   `bun test <suite>` as its probe, then the lane runs the suite again — each
   DB route suite executes ~2x in CI. Replace the probe with a cheap
   connectivity check (`canConnect()` + `hasTable` on the suite's core table,
   using the schema-aware helpers from TASK-557-07-L01). The lane still runs
   the suite once.
2. `coderso-pr-gates.yml` bun-lane job: add `DATABASE_DIRECT_URL` from
   secrets/vars, keep `DATABASE_URL`, and switch `bun run test:bun:lane` to
   `bun run test:bun` (the new runner) or a dedicated
   `bun run test:bun:parallel --workers=4`. `timeout-minutes` may need to drop
   from 25 to ~15 after the speedup; keep a safety margin (20).

## Implementation Pseudocode
```ts
// scripts/run-bun-lane.ts (patch canRunSuite)
import { canConnect, hasTable } from "../tests/utils/db";

async function canRunSuite(suite: string) {
  try {
    if (!(await canConnect())) return false;
    const coreTable = tableForSuite(suite); // e.g. menus.test.ts -> "menus"
    if (coreTable) return await hasTable(coreTable);
    return true;
  } catch {
    return false;
  }
}

const tableForSuite = (suite: string): string | null => {
  const map: Record<string, string> = {
    "accessLogs.test.ts": "access_logs",
    "adminUsers.test.ts": "users",
    "menus.test.ts": "menus",
    "pages.test.ts": "pages",
    "settings.test.ts": "settings",
    "search.test.ts": "search_documents",
    // extend per suite; unknown suites return null -> probe passes
  };
  const base = suite.split("/").pop() ?? "";
  return map[base] ?? null;
};
```

CI workflow patch (`coderso-pr-gates.yml`, bun-lane job):
```yaml
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL || vars.DATABASE_URL }}
      DATABASE_DIRECT_URL: ${{ secrets.DATABASE_DIRECT_URL || vars.DATABASE_DIRECT_URL }}
      BUN_TEST_WORKERS: "4"   # ubuntu-latest = 4 vCPU
```
and the run step: `bun run test:bun:parallel --workers=${{ env.BUN_TEST_WORKERS }}`
(or keep `test:bun:lane` if the runner is adopted there; record the choice).
Add `DATABASE_DIRECT_URL` to the repo's secret/variable documentation
(`docs/develop/*` or the CI env docs).

Error handling: `canRunSuite` never throws (returns false on probe failure ->
suite skipped with a warning, same as today); the runner's provision step fails
CI loudly if `DATABASE_DIRECT_URL` is missing (named error).

Regression-test shape:
- Pure: `tableForSuite("tests/integration/routes/menus.test.ts")` == "menus";
  unknown suite -> null.
- DB-gated: `canRunSuite("tests/integration/routes/menus.test.ts")` is true
  against a migrated worker schema and false when the table is absent
  (throwaway schema without migration).
- CI: YAML parses; the lane step runs the runner (validated in a PR run or
  recorded as CI-only).

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/unit/toolchain/bunLaneCiProbe.test.ts` green (pure +
  DB-gated).
- Run `bun scripts/run-bun-lane.ts --test` once with the fix; record suite
  count and that no suite executed twice (assert via probe-count log).

## Documentation Updates Required
- CI env docs: `DATABASE_DIRECT_URL` required for the bun lane.
