# TASK-184-17: Docs, Commands, and Closure
# FileName: TASK-184-17_Docs_Commands_and_Closure.md

**Priority:** High
**Category:** Docs + QA Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01, TASK-184-02, TASK-184-03, TASK-184-04, TASK-184-05, TASK-184-06, TASK-184-07, TASK-184-08, TASK-184-09, TASK-184-10, TASK-184-11, TASK-184-12, TASK-184-13, TASK-184-14, TASK-184-15, TASK-184-16
**Status:** Done (2026-04-18)

---

## Overview

Close TASK-184 by wiring commands, docs, changelog, and final validation for the full live Admin UI operation matrix.

## Sub-Tasks

No child task files.

## Files to Change

- `package.json`
- `_docs/TESTING_STRATEGY.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/TASK-184*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*`

## Command Contract

Add clear commands for the new suite:

- `test:assistant:live:cms`
- `test:assistant:live:cms:openai`
- `test:assistant:live:cms:openrouter`

The existing `test:assistant:live` can remain the lightweight natural prompt smoke or be documented as distinct from the mutating full Admin UI live matrix.

## Closure Checklist

1. Every TASK-184 leaf has completion notes and validation.
2. The navigation coverage map covers every visible/default Admin UI menu item plus settings subpages and planned Coderso modules.
3. Every live test uses `.env` provider vars and skips cleanly when missing.
4. DB-backed live matrix verifies database reachability before mutation.
5. Cleanup is proven and documented.
6. Changelog records live provider and DB validation status.
7. Default CI behavior is clear: opt-in live tests are not run accidentally without credentials and a disposable DB.

## Security Contract

- Visibility: docs/process and test commands only.
- Auth model: no runtime change.
- RBAC: docs must state that live tests use test admin permissions only.
- CSRF: docs must state route/service ownership.
- Rate-limit bucket: docs must state opt-in provider cost/rate implications.
- Reject-unknown validation: docs must state provider output remains untrusted.
- Anti-abuse: docs must state disposable DB/test prefix/cleanup requirements.
- Secret handling: docs must not include keys or sensitive payloads.

## Testing Requirements

- Full TASK-184 validation:
  - `set -a && source .env && set +a && bun run test:assistant:live:cms`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted helper unit/Vitest suites

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-04-18)

- Added `test:assistant:live:cms`, `test:assistant:live:cms:openai`, and `test:assistant:live:cms:openrouter`.
- Updated `_docs/TESTING_STRATEGY.md` and `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`.
- Closed the TASK-184 umbrella after live matrix, coverage map, docs, and validation.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-cms-harness.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/ui/settings-sidebar.test.tsx`
- `set -a && source .env && set +a && bun run test:assistant:live:cms`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
