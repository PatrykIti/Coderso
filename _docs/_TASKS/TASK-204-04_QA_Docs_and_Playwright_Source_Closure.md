# TASK-204-04: QA Docs and Playwright Source Closure
# FileName: TASK-204-04_QA_Docs_and_Playwright_Source_Closure.md

**Priority:** Medium
**Category:** CMS/Posts + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-204-01, TASK-204-02, TASK-204-03
**Status:** To Do

---

## Overview

Close `TASK-204` after the follow-up fixes land. This closure task exists
because the source report already contains both original findings and the
2026-04-23 replay state; final docs must not blur what was fixed in `TASK-195`
versus what `TASK-204` repaired or intentionally left open.

## Sub-Tasks

No child task files.

## Scope

- Run lint, typecheck, and the union of leaf-declared Vitest/Bun suites.
- Replay the relevant Posts flows with Playwright CLI or equivalent browser
  evidence.
- Update `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` with per-item closure evidence for:
  - `BUG-5`,
  - `UX-1`,
  - `UX-4`,
  - `UX-7`,
  - `BUG-6`,
  - `BUG-7`.
- Separate fixed, still-open capability, and environment/runtime failure states.
- Update product docs if the editor/API contract changed.
- Update task board and changelog when `TASK-204` is complete.

Out of scope:

- closing `TASK-203`, `TASK-201`, or unrelated Playwright report families;
- claiming `UX-4` fully fixed if Video/Gallery/Audio/File were not implemented
  end to end;
- running broad destructive DB scenarios without verifying `DATABASE_URL`
  reachability first.

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if taxonomy API contract changed
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if editor UX changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-204`

## Security Contract

- No new route or auth model during closure.
- Final QA must verify that any changed internal admin API route still requires
  the existing auth/RBAC path.
- Final docs must explicitly state that no raw SQL, stack traces, tokens,
  secrets, or private media URLs are exposed in the fixed taxonomy/revision
  paths.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites from `TASK-204-01` through `TASK-204-03`
- Bun taxonomy route suite if `taxonomyRoutes.ts` changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/taxonomy.test.ts`
- Additional media block contract suites if new media block types were accepted.
- Manual Playwright replay of the Posts scenarios listed in the
  `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` re-verification section.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if API error contracts changed
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if editor UX changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-204`

## Acceptance Criteria

1. Every remaining Posts replay item has closure evidence, an explicit open
   state, or a named follow-up.
2. Source docs, task board, and changelog agree with the final implementation.
3. Validation commands are recorded with pass/fail status.
4. Any skipped DB/runtime validation is stated with the concrete reason.
