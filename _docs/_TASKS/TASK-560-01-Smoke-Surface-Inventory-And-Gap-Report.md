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
- Read the task files/changelogs for 490/492/487/488/491/511/517/559 smoke
  scenario lists (they are the acceptance contract for the new suites).
- Do not edit any file; findings only.
