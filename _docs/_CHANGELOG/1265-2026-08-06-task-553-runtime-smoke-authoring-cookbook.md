# 1265 - TASK-553 Runtime Smoke Authoring Cookbook

**Date:** 2026-08-06
**Version:** Unreleased
**Tasks:** TASK-553, TASK-553-01, TASK-553-01-L01
**Type:** Testing/Developer Experience/Documentation/Task Board

## Overview

Adds the canonical contributor cookbook for extending the shared runtime-smoke
platform delivered by TASK-552. Future workflows now have one source-grounded
recipe for registration, adapters, lifecycle, persistent Bun/DB workers,
transactional database batches, Playwright segments, evidence, checkpoints,
reports, and focused validation.

## Key Changes

### Complete authoring path

- Documents all four static suite-registration edits and the fail-closed
  synchronization required between CLI profiles, adapter metadata, and the
  adapter's run guard.
- Provides copyable seams for thin adapters, immediate lifecycle ownership,
  supervised processes, readiness polling, strict registered operations,
  suite-scoped worker entries, and isolated lazy worker profiles.
- Documents stable versioned handler identity, `DB_POOL_MAX=1`, least-privilege
  environments, the exact retry boundary, and uncertain-mutation reconciliation
  without automatic replay.

### Database, browser, evidence, and resume

- Documents fixture ledgers, FK-safe cleanup waves, set-based transactional
  ownership/delete/proof, stable logical projection, and explicit API/storage
  cleanup ownership.
- Documents browser dependency barriers, post-materialization byte splitting,
  named Playwright sessions, first-failure framing, visible-effect assertions,
  console/page-error observation, bounded PNG evidence, and repository guards.
- States that checkpoint primitives alone do not provide resume. No current
  adapter consumes them end to end, and TASK-540 still uses canonical full-flow
  cleanup despite its reset inventory.

### Discoverability and governance

- Links the cookbook from the developer handbook, testing overview,
  `tests/README.md`, `_docs/TESTING_STRATEGY.md`, and the runtime-smoke authoring
  rule in `AGENTS.md`.
- Adds focused test guidance, a closure checklist, and a common-mistakes table
  so new workflows reuse the shared platform instead of rebuilding it.

## Validation

- Verified local Markdown link targets across all touched documentation.
- Verified TASK-553 H1/FileName/parent/status/changelog relationships, board
  statistics, and changelog index state.
- `git diff --check` and touched-file physical line-count gate passed.
- No executable source, product contract, schema, migration, dependency, or
  runtime evidence changed; product smokes and unrelated gates were not rerun.
