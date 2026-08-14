# 1271 - TASK-557 Bun Test Lane Remote Parallel Speedup (direct 5432)

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-557, TASK-557-01, TASK-557-01-L01, TASK-557-01-L02, TASK-557-02, TASK-557-02-L01, TASK-557-02-L02, TASK-557-03, TASK-557-03-L01, TASK-557-03-L02, TASK-557-03-L03, TASK-557-04, TASK-557-04-L01, TASK-557-04-L02, TASK-557-05, TASK-557-05-L01, TASK-557-05-L02, TASK-557-05-L03, TASK-557-06, TASK-557-06-L01, TASK-557-06-L02

## Key Changes

- **Per-worker schema provisioning + custom migration applier**: `bun_worker_N` schemas with a migration applier that rewrites `REFERENCES "public"."X"` to the target worker schema at apply time (73 FK clauses across 71 SQL files), keeping public-schema migrations byte-identical.
- **Weighted parallel runner** (`bun scripts/run-bun-parallel.ts --lane all`): B files partitioned longest-first across workers, C serial on one worker, pure A lane at `--parallel=16`, perf lane strictly after B/C/A (CPU-isolated). Retry-once flake guard on every worker including A. Connection budget `workers × pool ≤ 10`; defaults `pool=2`, `workers=5` so row-lock tests needing 2 connections no longer starve.
- **Fence namespace isolation**: `resolveFenceNamespace` seam with test-only offset; legacy install-run lock persistence split cohesively below the 1,000-line gate.
- **Static classifier** follows module-scope awaited imports and the transitive `db/client` closure (Bun mocks honored), so the pure A lane is truly DB-free; pure lane runs with `--env-file=/dev/null` and stripped DB env (fail-loud guard).

## Validation

- **Full-lane acceptance on remote Render DB (direct 5432): PASS (exit 0)** — 2414 tests / 380 files, 2390 pass / 24 skip / 0 fail in **22m15s** (from a ~50 min serial baseline, a 2.3× speedup).
- All workers green on first attempt (A lane's previously flaky repo-wide scan tests pass with the retry guard without firing).
- Targeted suites: partitioner 10/10, migrate unit+integration 9/9 (FK confrelid proof), provision/provisioning/fenceIsolation 13/13, pure-lane 20/20, runner integration 16/16, manifest 8/8, perf policy 11/11.
- Core lint, lint:types, repo tsc, precommit:check, git diff --check clean; all files ≤1,000 physical lines.

## Notes

- All 8 children + 18 executable leaves terminal. The 10–15 min target is not yet met: the serial C lane (39 shared-state files, ~22 min) is the wall bound; a follow-up optimization (C split or shard) is needed to reach it. The `test:bun` command now runs the parallel orchestrator.
