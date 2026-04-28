# TASK-187: Assistant Filtered All Delete and Je Follow-Up
# FileName: TASK-187_Assistant_Filtered_All_Delete_and_Je_Follow_Up.md

**Priority:** High
**Category:** Assistant/Core + Planning State
**Estimated Effort:** Small
**Dependencies:** TASK-184, TASK-186
**Status:** Done (2026-04-18)

---

## Overview

Fix two related page delete planning gaps:

1. `usun je` after a prior inspection was not recognized as a follow-up pronoun.
2. `znajdz wszystkie opublikowane strony i je usun` fell back to active-page delete needs-input instead of planning deletes for the filtered published page set.

The planner should support reviewed typed actions when the user explicitly asks for all resources matching a safe filter, such as all published pages.

## Sub-Tasks

No child task files.

## Files Changed

- `core/services/assistant/cmsPlanningState.ts`
- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/cmsOperationActionMapper.ts`
- `core/services/assistant/actionPlannerService.ts`
- `tests/vitest/assistant/cms-planning-state.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: unchanged; execution still goes through reviewed typed actions and permissions.
- CSRF: no route change.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: CMS operation drafts and typed action schemas remain strict.
- Anti-abuse: unfiltered broad destructive prompts remain gated; filtered-all destructive plans require explicit filters and review.
- Secret handling: no secrets, submissions, provider keys, cookies, or CSRF tokens in planning state.

## Testing Requirements

- Planning state regression for `usun je`.
- Planner regression for broad inspection candidate follow-up.
- Planner regression for `znajdz wszystkie opublikowane strony i je usun`.
- Validation:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-target-resolver.test.ts`
  - `bun run test:assistant:live:openai`
  - `bun run test:assistant:live:openrouter`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- changelog entry

## Completion Notes (2026-04-18)

- Added `je` as a planning-state follow-up signal.
- CMS prompt draft inference now carries status/visibility filters from natural prompts.
- Filtered all destructive prompts can map all filtered candidates to reviewed typed actions.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-target-resolver.test.ts`
- `set -a && source .env && set +a && bun run test:assistant:live:openai`
- `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
