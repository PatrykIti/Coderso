# TASK-557-05-L03: Runner Tests and Dry-Run
# FileName: TASK-557-05-L03-Runner-Tests-And-Dry-Run.md
**Parent Subtask:** TASK-557-05
**Priority:** Medium
**Category:** Testing / Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-557-05-L02 (orchestration)
**Status:** ✅ Done
**Completed:** 2026-08-14
---
## Overview
Own the regression suite for the partitioner + orchestrator so the runner's
contract stays truthful: deterministic assignment, C isolation, retry-once
flake policy, exit aggregation, dry-run stability, and no mutation of `public`.
Tests use a stub `bun` shim (a shell/JS fixture) for pure orchestration
assertions and the real `bun` only for dry-run; DB-gated tests cover the
provision-then-run path against a throwaway schema.

## Implementation Pseudocode
```ts
// tests/integration/toolchain/runBunParallel.test.ts
import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { partition, partitionSummary, weightMs } from "../../../scripts/bun-lane-partition";

let scratch: string;
beforeAll(async () => { scratch = await mkdtemp(path.join(tmpdir(), "bun-lane-")); });
afterAll(async () => { await rm(scratch, { recursive: true, force: true }); });

const ROWS = [
  { file: "a.test.ts", bucket: "B", weightMs: 100 },
  { file: "b.test.ts", bucket: "B", weightMs: 90 },
  { file: "c.test.ts", bucket: "B", weightMs: 80 },
  { file: "d.test.ts", bucket: "B", weightMs: 70 },
  { file: "x.test.ts", bucket: "C" },
  { file: "y.test.ts", bucket: "C" },
  { file: "p1.test.ts", bucket: "perf" },
] as const;

test("partition keeps C and perf separate and balances B", () => {
  const p = partition(ROWS as never, {}, 2);
  expect(p.c).toEqual(["x.test.ts", "y.test.ts"]);
  expect(p.perf).toEqual(["p1.test.ts"]);
  const union = [...p.b.flat(), ...p.c, ...p.perf].sort();
  expect(union).toEqual(ROWS.map((r) => r.file).sort());
  const sums = p.b.map((files) => files.reduce((s, f) => s + weightMs({ file: f } as never, {}), 0));
  expect(Math.max(...sums) - Math.min(...sums)).toBeLessThanOrEqual(30);
});

test("dry-run summary is stable on fixed timings", () => {
  const p = partition(ROWS as never, {}, 2);
  const s = partitionSummary(p, {});
  expect(s).toContain("worker-c: 2 files (serial)");
  expect(s).toContain("worker-perf: 1 files (serial)");
});
```

Fake-worker retry test (pure, no DB): create `stub-bun.sh` in scratch that
exits 1 if the file list contains `b.test.ts`, else 0. Spawn the runner with
`BUN=stub-bun.sh` override env (or pass a `--bun <path>` flag added to the
orchestrator for testability) and assert:
- worker containing `b.test.ts` runs twice (`attempted: 2`), others once;
- report file exists and overall exit is 0 after retry when the stub passes on
  the second attempt, and 1 when it fails both times.
- `--no-retry` sets `attempted: 1` even on failure.

DB-gated provision+run test:
- With `DATABASE_DIRECT_URL`, run `provisionWorkers(url, 2)` then a minimal
  real worker (`bun test` on one known-safe DB file, e.g.
  `tests/unit/settings/settingsService.test.ts`) with `resolveWorkerEnv(0)`;
  assert exit 0, and that the schema `bun_worker_0` holds the expected rows
  and `public` is untouched (control query: `select count(*) from pg_tables
  where schemaname = 'public'` unchanged vs before).

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Pure tests green always; DB-gated tests skip without `DATABASE_DIRECT_URL`.
- Fake-worker tests never spawn real `bun test` (stub only).
- Record dry-run summary + one real worker smoke in the handoff.

## Documentation Updates Required
- `tests/README.md` — testable runner contract (stub `bun`, `--report`).
