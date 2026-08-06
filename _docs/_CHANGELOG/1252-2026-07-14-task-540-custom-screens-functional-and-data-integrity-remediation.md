# 1252 - TASK-540 Custom Screens Functional and Data-Integrity Remediation

Date: 2026-07-14
Completed: 2026-08-06
Version: Unreleased
Tasks: TASK-540, TASK-540-01, TASK-540-01-L01, TASK-540-02, TASK-540-02-L01, TASK-540-03, TASK-540-03-L01, TASK-540-04, TASK-540-04-L01, TASK-540-04-L02, TASK-540-04-L03, TASK-540-04-L04, TASK-540-05, TASK-540-05-L01, TASK-540-05-L02, TASK-540-06, TASK-540-06-L01, TASK-540-07, TASK-540-07-L01, TASK-540-07-L02

## Key Changes

- Tightened Custom Screen document validation, URL and binding normalization, tab identity,
  stale-binding pruning, stored-read repair, and route-level integrity handling.
- Completed Button link binding, nested Tabs authoring and accessible runtime keyboard/selection
  semantics without introducing a generic widget surface.
- Made related-entry and content-type reads retryable and generation-safe; protected dirty Entry
  and Screen drafts from stale cache events and navigation loss.
- Kept responsive canvases usable, corrected ARIA ownership, persisted per-user Screen
  preferences, and preserved presentation/media selection across save and refresh boundaries.
- Fixed the runtime-smoke sign-out settlement race by sampling the login URL only after the
  login controls settle; the app logout contract itself was unchanged.
- Retained migration 0070's access-log lookup index intentionally for recurring smoke cleanup;
  its SQL comment records that owner-approved performance decision.

## Validation and Smoke

- Relevant core lint, type checks, root TypeScript, targeted Vitest, targeted Bun, workflow
  self-tests, task-graph checks, and touched-file line limits passed on the final source shape.
- Five post-implementation lenses were clean except the naming-only deferred LOW already owned
  by TASK-9999-01-L01; it has no current behavior, data, security, or test-integrity impact.
- The final `playwright-cli` runtime smoke passed all seven real flows with prefix
  `wf540-c3d4e5f6a7b8`, retained 13 valid PNG paths across light/dark and responsive scenarios,
  reported no console/page error, and left no browser session, helper process, or ports on
  3000/5173/5174 after cleanup.
- One repository-wide `bun run test` attempt exited non-zero after its executor suppressed the
  failing test identifier and output. It was not replayed solely to rediscover that hidden name:
  the touched-contract test lanes, static checks, workflow self-tests, and required runtime smoke
  were green. The executor observability gap is recorded by the updated repository workflow rule.

## Manual Closure Authority

TASK-540 was closed manually from the validated working tree after the canonical runtime smoke.
The readable task/changelog evidence is the closure authority; the task-local generated
collaboration-ledger and terminal-resume envelope were not fabricated or used. This avoids
replaying already successful audits, validation phases, and runtime flows solely to satisfy
task-specific orchestration metadata.
