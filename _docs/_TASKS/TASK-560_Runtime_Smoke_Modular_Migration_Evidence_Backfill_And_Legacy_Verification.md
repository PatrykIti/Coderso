# TASK-560: Runtime Smoke Modular Migration, Evidence Backfill, and Legacy Verification

**Status:** ✅ Done
**Started:** 2026-08-15
**Completed:** 2026-08-17
**Priority:** High
**Size:** Large

# FileName: TASK-560_Runtime_Smoke_Modular_Migration_Evidence_Backfill_And_Legacy_Verification.md

**Parent Task:** none

## Purpose

The 2026-08-15 four-stream merge (TASK-559, small stream 490/492/487/488/491,
TASK-511, TASK-517) closed eight tasks whose runtime smokes PASSED in their
worktrees but whose **evidence and suites were never committed** — the repo
convention (TASK-540/545/547/554) is durable evidence under
`_docs/_workflows/_smoke/evidence/<task>/<session>/report.json` plus shots, and
reusable suites registered through the shared runtime-smoke entry
(`bun scripts/runtime-smoke.ts run --suite <suite> --profile <fast|certification>
--session <name>`, cookbook `docs/develop/runtime-smoke-cookbook.md`). This task
(a) inventories which smoke surfaces are legacy vs modular, (b) authors the
missing modular suites for the merged feature areas, (c) runs the legacy
registered suites on the merged tree, (d) runs the new suites and commits
evidence, and (e) closes with changelog 1282.

## Scope

- Inventory: every smoke surface in the repo (shared-entry suites, legacy
  task-local `playwright-cli` sessions, `scripts/playwright-widget-contract-smoke.ts`,
  `production-boundary` adapter, historical `_docs/_workflows/_smoke/*` screenshots,
  `.playwright-cli/` artifacts) classified as MODULAR (shared entry + adapters +
  workers + DB batches + browser segments + checkpoints + redaction + timing +
  reports) vs LEGACY (anything else).
- Author missing modular suites through the shared entry for the merged feature
  areas: 490 forms submissions export, 492 login alert delivery settings,
  487 entry revision history/restore drawer, 488 commerce variant editor +
  collections CRUD, 491 integrations (GA head tag, Slack/Zapier events, Sentry
  init, health), 511 backup v2 (.cbk create/download/restore gate), 517 entry
  visibility (private 404, password prompt, unlock cookie, cache exemption).
  TASK-559 has no browser UI (lane acceptance already re-run post-merge) — cover
  it only via the lane report evidence note.
- Run legacy registered suites (task-540, task-547, task-554) with the shared
  entry on the merged tree, fast profile; record results.
- Run the new suites (fast profile), assert visible effect (computed styles,
  geometry, DOM state), light+dark for admin surfaces, 0 console errors, save
  report.json + screenshots under `_docs/_workflows/_smoke/evidence/<task>/<session>/`
  and COMMIT them (the whole `_docs/_workflows/` tree is tracked since 2026-08-15;
  nothing under it may be gitignored).
- Docs: update `docs/develop/runtime-smoke-cookbook.md` only if the shared entry
  needs registration recipes for the new suites; never create a second lifecycle.

## Out of scope

- TASK-551/555/485/493 implementation programs (separate families).
- Changing the shared runtime-smoke lifecycle, worker, cleanup, Playwright, or
  report loops (only thin statically registered adapters may be added).
- Re-running certification profiles; fast profile is the required lane.

## Children

- `TASK-560-01` — Smoke surface inventory and gap report (read-only)
- `TASK-560-02` — Author modular suites for merged feature areas (490/492/487/488/491/511/517)
- `TASK-560-03` — Run legacy registered suites (task-540/547/554) on merged tree
- `TASK-560-04` — Run new suites and commit evidence
- `TASK-560-05` — Docs, board, changelog 1282, closure

## Security Contract

Testing-infrastructure task: no new API routes, no production code changes
expected (suite adapters + evidence only). If an adapter needs a test-only
admin API seam, it must use existing internal endpoints with the existing RBAC
and rate-limit buckets; no new public endpoints. Evidence reports must be
redacted (no credentials, tokens, PII, raw user data) per
`_docs/SECURITY_SPEC.md` and the cookbook redaction rules.
