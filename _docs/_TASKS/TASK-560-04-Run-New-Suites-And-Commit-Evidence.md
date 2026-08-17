# TASK-560-04: Run New Suites and Commit Evidence

**Status:** ✅ Done
**Started:** 2026-08-15
**Completed:** 2026-08-17
**Priority:** High
**Size:** Large

# FileName: TASK-560-04-Run-New-Suites-And-Commit-Evidence.md

**Parent Task:** TASK-560

## Purpose

Run every suite authored in TASK-560-02 on the merged tree (fast profile),
verify the acceptance assertions (visible effect, ≥5 distinct scenarios per
area, light+dark admin, 0 console errors), and commit the durable evidence.

## Method

1. Dev servers up; run each new suite:
   `bun scripts/runtime-smoke.ts run --suite task-5XX --profile fast
   --session wf560-<task>smoke`.
2. Verify report.json (scenario checkpoints, console error counts, timings)
   and screenshots land under `_docs/_workflows/_smoke/evidence/<task>/<session>/`.
3. Assert 0 console errors per flow; dark mode alongside light for admin
   surfaces; visible-effect assertions (computed styles, geometry, DOM state)
   rather than mere presence.
4. Commit evidence files (the whole `_docs/_workflows/` tree is tracked; nothing
   may be gitignored) with the suite adapters from TASK-560-02.

## Acceptance

- Every new suite green with committed report.json + screenshots.
- `git ls-files _docs/_workflows/_smoke/evidence/` contains the new sessions.
