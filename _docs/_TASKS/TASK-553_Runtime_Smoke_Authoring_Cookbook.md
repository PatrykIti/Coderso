# TASK-553: Runtime Smoke Authoring Cookbook
# FileName: TASK-553_Runtime_Smoke_Authoring_Cookbook.md

**Priority:** High
**Category:** Testing / Developer Experience / Documentation
**Estimated Effort:** Small
**Dependencies:** TASK-552 complete
**Related Tasks:** TASK-540, TASK-545, TASK-548, TASK-551
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1265

---

## Overview

Add one canonical, contributor-facing cookbook for creating runtime-smoke
suites on the shared TASK-552 platform. The guide must be grounded in the
landed APIs and show how future workflows reuse the static CLI/registry,
lifecycle, process supervisor, profile-scoped Bun workers, bounded database
batches, Playwright transport, repository/evidence guards, checkpoints, and
reports.

The documentation must distinguish reusable platform ownership from
suite-specific product flow ownership, and must not claim automatic checkpoint
resume where no adapter consumes the checkpoint store end to end.

## Scope

- Add `docs/develop/runtime-smoke-cookbook.md` as the single detailed recipe.
- Cover suite registration, a thin adapter, lifecycle, readiness polling,
  process supervision, worker definitions/entry/pool, DB fixture ledgers and
  transactional cleanup, browser planning/materialized splits, Playwright
  evidence, checkpoint constraints, profiles, reports, tests, and common
  failures.
- Link the cookbook from the developer handbook, testing overview, runtime
  smoke test README, internal testing strategy, and the runtime-smoke rule in
  `AGENTS.md`.
- Keep examples source-accurate, bounded, least-privilege, and explicit about
  mutation retry and cleanup proof semantics.

## Out of Scope

- Product, API, UI, auth, RBAC, CSRF, rate-limit, persistence, schema, migration,
  snapshot, journal, dependency, or runtime-harness behavior changes.
- Re-running product runtime smokes or unrelated release/security gates for a
  documentation-only change.
- Claiming TASK-540 resume, additional benchmark gains, or new DB/index work.

## Sub-Tasks

| ID | Title | Status |
|---|---|---|
| TASK-553-01 | Cookbook Contract and Examples | ✅ Done |

## Acceptance Criteria

- A contributor can add a suite without rediscovering registration, lifecycle,
  worker, batching, browser, evidence, cleanup, or validation contracts.
- The guide identifies all four registration edits and the three profile
  declarations that must stay synchronized.
- Worker examples use stable versioned artifacts rather than
  cross-runtime `Function#toString()` authority.
- DB examples preserve exact ownership, transaction-handle use, FK-safe waves,
  stable receipts, and post-commit absence proof.
- Browser examples split after source materialization and never cross runtime,
  standalone, scenario, capture, or isolation barriers.
- Checkpoint text states that primitives alone do not create safe resume and
  records TASK-540's current no-resume status.
- All documentation links resolve, task/changelog/index state is synchronized,
  every added file remains at most 1,000 lines, and no production/test module is
  added or modified above the repository limit.

## Security Contract

- **Visibility:** documentation-only; no endpoint is added or changed.
- **Auth/RBAC/CSRF/rate limits:** product contracts are unchanged.
- **Validation:** examples require static registered suites, exact schemas,
  bounded data, least-privilege environments, and fail-closed cleanup/proofs.
- **Anti-abuse/secrets:** public-write nonce/HMAC/CAPTCHA are not applicable.
  Examples prohibit credentials, cookies, tokens, headers, raw SQL/binds, PII,
  raw DOM, and raw logs in protocols or evidence.

## Testing Requirements

- Validate every local Markdown link in the cookbook and touched index pages.
- Validate H1/FileName/parent/status/changelog consistency for the TASK-553
  family.
- Run `git diff --check`, added-file line counts, and the production/test
  touched-file gate (no production/test module is changed by this task).
- No runtime smoke is required because no executable harness or product
  contract changes.

## Documentation Updates Required

- `docs/develop/runtime-smoke-cookbook.md`
- `docs/develop/README.md`
- `docs/develop/testing.md`
- `tests/README.md`
- `_docs/TESTING_STRATEGY.md`
- `AGENTS.md`
- TASK-553 family, board, changelog 1265, and changelog index

## Completion Evidence

- Three fresh read-only source audits independently grounded adapter/lifecycle,
  worker/DB, and browser/checkpoint recipes against the landed TASK-552 APIs.
- The canonical cookbook contains the complete authoring path and a final
  review checklist while remaining below the 1,000-line repository limit.
- Targeted link, task graph, changelog, whitespace, and line-count validation
  passed; executable product/runtime lanes were intentionally not replayed.
