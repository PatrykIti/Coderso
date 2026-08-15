# TASK-560-01: Smoke Surface Inventory and Gap Report

**Status:** 🚧 In Progress
**Started:** 2026-08-15
**Completed:**
**Priority:** High
**Size:** Medium

# FileName: TASK-560-01-Smoke-Surface-Inventory-And-Gap-Report.md

**Parent Task:** TASK-560

## Purpose

Read-only inventory of every smoke surface in the repository, classified as
MODULAR (shared entry `scripts/runtime-smoke.ts`, statically registered suite
adapters, shared lifecycle/workers/DB batches/browser segments/checkpoints/
redaction/timing/reporting) vs LEGACY (task-local `playwright-cli` sessions,
standalone scripts, ad-hoc artifacts), plus a gap list of the merged feature
areas (490/492/487/488/491/511/517/559) that have NO committed modular suite
and NO committed evidence.

## Deliverables

1. Inventory table (file → classification → owner task → status):
   - `scripts/runtime-smoke/` adapters (`task-540`, `task-547`, `task-554`,
     `production-boundary`), the shared entry, cookbook registration recipes.
   - `scripts/playwright-widget-contract-smoke.ts` and any other standalone
     smoke scripts under `scripts/`.
   - `_docs/_workflows/_smoke/` committed evidence (which tasks have durable
     report.json + shots) and which are screenshots-only without reports.
   - `.playwright-cli/` and `_docs/PLAYWRIGHT/` artifacts (legacy).
   - Legacy smoke workflow scripts `_docs/_workflows/task-*-implement.mjs` that
     embed their own Playwright loops (TASK-486/511/514/516/517 etc.).
2. Gap report: for each merged area, whether a modular suite exists, whether
   evidence is committed, and what must be authored (with the task's original
   smoke scenario list from its task file/changelog as the source contract).

## Method

- Ground every claim with `file:line` or `git ls-files` evidence.
- PRIMARY source for the scenario lists: changelogs 1275-1281
  (`_docs/_CHANGELOG/`) plus TASK-517-03 task file (they hold the per-area
  runtime smoke scenario lists; the parent task files of 490/492/487/488/491
  contain zero smoke mentions — audit finding LOW-2). Extract and record the
  lists verbatim as an appendix to this file.
- Do not edit any file; findings only.

## Appendix: per-area scenario lists (from changelogs 1275-1281 + TASK-517-03)

- 490 (changelog 1275, wf490smoke, 5): admin login; Forms → Submissions nav;
  CSV download + content; JSON download + content; dark-mode parity; 0 console errors.
- 492 (1276, 5): login; Login Alerts controls; webhook enable + URL/secret
  fields; edit + save (PATCH 200, secret encrypted at rest, only `{configured}`
  exposed); dark parity; 0 console errors.
- 487 (1277, 6): login; editor nav; History drawer with 2 revisions;
  confirm-gated restore (POST 200, data restored, drawer closes); SEO fields
  visible; dark parity; 0 console errors.
- 488 (1278, 5): login; commerce list → Manage collections route; create
  collection (POST 200, visible + assignable); variant editor (Add variant →
  Default variant 1 card with remove/inventory/attributes); dark parity;
  0 console errors.
- 491 (1279, 5): login; Integrations health states; Connect GA drawer →
  PATCH 200 (connected, health unknown); GA gtag injected in public HTML
  (G-WF491SMOKE); dark parity; 0 console errors.
- 511 (1281, 5): login; Backups schedule card; encrypted Create backup
  (POST 200, .cbk); Import dialog; Update Schedule (PATCH 200); 0 console errors.
- 517 (1280 + TASK-517-03:199-234, 6 flows): public renders to anon (cached,
  2nd load served); private → anon 404 identical to missing slug + admin
  renders; password → prompt (no body) → wrong re-prompts → correct unlocks +
  body → reload stays unlocked (TTL); cross-entry cookie does not unlock B;
  private/password body never served from shared cache to ungated fresh
  session; publish → front parity + no 401/403 existence leak + private/password
  absent from anon search + listing; light+dark admin, 0 console errors.
- 559 (1274): no browser UI (Bun lane acceptance re-run post-merge; note only).
