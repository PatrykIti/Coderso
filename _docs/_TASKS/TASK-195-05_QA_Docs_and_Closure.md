# TASK-195-05: QA, Docs, and Closure
# FileName: TASK-195-05_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** CMS/Posts + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-195-01, TASK-195-02, TASK-195-03, TASK-195-04
**Status:** To Do

---

## Overview

Close the `TASK-195` Posts QA recovery wave with final validation, docs parity,
board/changelog sync, and explicit replay of the report scenarios from
`_docs/PLAYWRIGHT/SUMMARY-POSTS.md`.
Closure must also separate in-scope fixes from still-reproducible issues that
belong to a different owner wave.

## Sub-Tasks

No child task files.

## Scope

- Re-run lint, typecheck, and the targeted Vitest/Bun suites declared by the
  completed leaves.
- Replay the report checklist against the final branch state.
- Update docs, changelog, and `_docs/_TASKS/README.md`.
- Record any remaining environment-only console failures separately from the
  product-owned fixes.
- If replay still surfaces an out-of-scope issue, create and link a dedicated
  follow-up task file with exact evidence and owner seams before marking
  `TASK-195` done.

Out of scope:

- opening a second follow-up umbrella for unrelated infra issues,
- broad full-repo regression runs beyond the touched Posts surfaces unless a
  closure failure proves they are needed.

## Files to Change

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` only if still relevant
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-195`

## Security Contract

- No new route or auth model is introduced during closure.
- Final QA must confirm that internal admin routes still honor the existing
  permissions and that no new public write surface was added by the leaf work.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites from `TASK-195-01` through `TASK-195-04`
- Bun suites only if those leaves widened route/service contracts
- replay of the user-facing Posts scenarios from
  `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- replay of the captured console-failure scenarios from
  `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
  - if autosave/server/runtime failures still reproduce, record the exact error
    strings plus the current route/settings owners in the linked follow-up task

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-195`

## Acceptance Criteria

1. Every `TASK-195-*` leaf is complete and validated in its declared lane.
2. The report scenarios have been replayed against the final branch state.
3. Docs, task board, and changelog are synchronized with the shipped Posts QA
   contract.
4. Any still-reproducible server/runtime autosave failure or broader
   capability gap outside the current leaf scopes is captured in a linked
   follow-up task file with named owners and evidence before closure.
