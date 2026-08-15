# TASK-560-03: Run Legacy Registered Suites on the Merged Tree

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** High
**Size:** Medium

# FileName: TASK-560-03-Run-Legacy-Registered-Suites-On-The-Merged-Tree.md

**Parent Task:** TASK-560

## Purpose

Run the pre-existing modular registered suites (task-540, task-547, task-554,
production-boundary where applicable) through the shared entry on the final
merged tree (`feat/implementations`) with the fast profile, and record the
results as evidence. These suites predate the 2026-08-15 merge and must be
re-verified after it.

## Method

1. Restart dev servers from the merged tree (Bun server does not hot-reload;
   clear `core/node_modules/.vite` if the 504 Outdated Optimize Dep appears).
2. For each suite: `bun scripts/runtime-smoke.ts run --suite task-5XX
   --profile fast --session <name>` with a task-scoped session name.
3. Assert exit 0, scenario checkpoints, 0 console errors; save report.json +
   screenshots under `_docs/_workflows/_smoke/evidence/<suite>/<session>/`.
4. Any failure: re-run the named failing scenario/suite once in isolation;
   distinguish real regression (fix, root cause) from under-load flake
   (record and re-run).

## Acceptance

- task-540 fast, task-547 fast, task-554 fast all exit 0 on the merged tree.
- Evidence committed under `_docs/_workflows/_smoke/evidence/`.
