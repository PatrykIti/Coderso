# TASK-553-01: Cookbook Contract and Examples
# FileName: TASK-553-01-Cookbook-Contract-And-Examples.md

**Parent Task:** TASK-553
**Priority:** High
**Category:** Testing / Developer Experience / Documentation
**Estimated Effort:** Small
**Dependencies:** TASK-552 complete
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1265 (family closure)

---

## Overview

Ground a complete runtime-smoke authoring recipe in the actual shared platform
contracts, publish it as one canonical developer document, and make it
discoverable from every existing runtime-smoke documentation entry point.

## Sub-Tasks

| ID | Title | Status |
|---|---|---|
| TASK-553-01-L01 | Write and Validate Runtime Smoke Cookbook | ✅ Done |

## Contract

The cookbook must explain:

- static suite/profile/adapter registration and its owning tests;
- thin adapter results, fail-closed errors, timings, repository guards, and the
  difference between `suiteCleanup` and lifecycle cleanup;
- immediate lifecycle registration, idempotent close, and real absence proof;
- absolute supervised executables, repo-local working directories,
  least-privilege environment projections, bounded output, and polling;
- stable registered worker operations, a suite-scoped worker entry, isolated
  lazy profiles, `DB_POOL_MAX=1`, and no mutation replay after delivery;
- fixture ledgers, child-before-parent waves, exact ownership, set-based
  transaction cleanup, uncertain-result reconciliation, and stable projection;
- logical browser actions, dependency barriers, post-materialization byte
  splitting, named Playwright sessions, visible-effect proof, console listeners,
  screenshots, and repository evidence;
- checkpoint seal prerequisites, end-to-end consumption requirements, and the
  current absence of automatic resume in TASK-540;
- fast/certification boundaries, bounded reports, focused tests, a completion
  checklist, and common mistakes.

## Single-Writer Ownership

TASK-553-01-L01 alone owns the cookbook, links, TASK-553 family files, task
board row/statistics, changelog 1265, and changelog index. It changes no source,
test, migration, dependency, or runtime evidence file.

## Security Contract

- **Visibility:** documentation-only; no endpoint.
- **Auth/RBAC/CSRF/rate limits:** unchanged.
- **Validation:** examples retain static allowlists, strict bounded schemas,
  exact ownership/proof, and least-privilege environment contracts.
- **Anti-abuse/secrets:** no public write; examples prohibit sensitive protocol,
  output, checkpoint, screenshot, and report data.

## Testing Requirements

- Local Markdown link validation.
- Task family and changelog consistency validation.
- `git diff --check` and touched-file physical line counts.
- No Bun/Vitest/runtime smoke because executable contracts are unchanged.

## Documentation Updates Required

Owned by TASK-553-01-L01 and enumerated in the parent task.

## Completion Evidence

The leaf published and linked the source-grounded cookbook, synchronized task
and changelog state, and passed the documentation-only validation contract.
