# TASK-560-03: Run Legacy Registered Suites on the Merged Tree

**Status:** ✅ Done
**Started:** 2026-08-15
**Completed:** 2026-08-17
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

## Known environment issue (diagnosed 2026-08-15, task-540)

The shared DB setting `site.adminPath` is `/admin-panel` (custom admin base
path; the dev host resolves it via `core/server/utils/adminPath.ts:11-14`
`resolveAdminPath` → `getSetting("site.adminPath")`, enforced by
`core/server/middleware/hostPolicy.ts:70-98` and `core/vite.config.ts:8-10`,
and serves admin/API under `/admin-panel/`), but
the task-540 suite hardcodes `/admin` in readiness/health/fixtures
(`platform-actions.ts:627` probes `:5173/admin/advanced/custom-screens` → 404 →
`smoke_output_invalid`). Secondary: stale `site.homepageId` makes the front
probe `:3000/` 404.

Fix options (verified by the diagnosis agent):
1. Mirror task-554's routing-settings lease in the task-540 native setup:
   snapshot `site.adminPath`/`site.adminBaseUrl`/`site.publicBaseUrl`, force
   `/admin`, restore in cleanup; also fix/lease `site.homepageId` or stop
   depending on a pre-existing published homepage.
2. Alternatively derive the ambient admin path from the DB across
   readiness/health/fixture/API code.

Apply one option, verify the suite to green, then run the remaining legacy
suites (task-547, task-554, widget-contract fast where registered).

## Acceptance

- task-540 fast, task-547 fast, task-554 fast all exit 0 on the merged tree.
- Evidence committed under `_docs/_workflows/_smoke/evidence/`.
