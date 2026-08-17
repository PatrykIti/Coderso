# TASK-9999-02-L03: Relabel Stale TASK-559 Acceptance Benchmark

**Status:** ⏳ To Do
**Started:**
**Completed:**

# FileName: TASK-9999-02-L03-Relabel-Stale-TASK-559-Acceptance-Benchmark.md

**Parent Subtask:** TASK-9999-02
**Source Findings:** TASK-559 stale evidence (audit `_TMP-audit-task-559-bun-lane-c-split.md`,
verified at HEAD `4e3dab15`)

## Purpose

TASK-559 still presents the 9.98-min acceptance (for the then-397-file manifest,
`tests/bun-lane-report-559-accept.json` and parent `TASK-559_...md:242-278`) as
its current acceptance. After the later manifest regeneration `bb5ab806`, the
manifest has 418 files (A=157, B=204, C=52, perf=5). The 9.98-min figure is
stale evidence, not a current benchmark; a fresh controlled run on the current
manifest with hash/count recorded is required before any re-claim of the
10-15-minute target.

## Scope

- Relabel the historical acceptance as historical evidence (manifest hash/count
  + date) in the parent and any acceptance notes.
- Do NOT claim the 10-15-minute target as current until a fresh controlled run
  is recorded with manifest hash/count and available DB.
- No code, test, or `Status:` change.

## Validation

- `bun test tests/unit/toolchain/bunLanePartition.test.ts` stays green.
- `git diff --stat` shows only TASK-559 documentation wording.

## Deferral Rationale

Docs-only stale benchmark label; zero product/data/security/perf/test-integrity
impact (the runner itself is healthy on current committed timings; the degraded
path is owned by active TASK-578).
