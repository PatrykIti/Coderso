# TASK-186: Assistant Follow-Up All Candidates Delete
# FileName: TASK-186_Assistant_Follow_Up_All_Candidates_Delete.md

**Priority:** High
**Category:** Assistant/Core + Planning State
**Estimated Effort:** Small
**Dependencies:** TASK-178-06, TASK-184
**Status:** Done (2026-04-18)

---

## Overview

Fix follow-up deletion after a broad read-only inspection with no explicit search query.

Observed flow:

1. User asks for all published pages.
2. Assistant returns several page candidates.
3. User says `usun te strony`.
4. Planner used the first candidate label (`home`) as a prefix and failed with `Matched 1 candidate(s), but expected 3`.

When prior planning state has multiple candidates and no query, the follow-up should target the exact previous candidate labels instead of inventing a prefix.

## Sub-Tasks

No child task files.

## Files Changed

- `core/services/assistant/cmsPlanningState.ts`
- `tests/vitest/assistant/cms-planning-state.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: unchanged; previous candidates remain advisory and are re-resolved through the current catalog.
- CSRF: no runtime route change.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: planning state still passes strict normalizer.
- Anti-abuse: destructive follow-ups still produce reviewed typed actions and require dry-run/execute.
- Secret handling: no secrets, submissions, provider keys, cookies, or CSRF tokens in planning state.

## Testing Requirements

- Planning state unit regression for no-query multi-candidate follow-up.
- Planner regression for `usun te strony` after broad page inspection.
- Validation:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- changelog entry

## Completion Notes (2026-04-18)

- Multi-candidate follow-ups with empty prior query now build an OR text query from exact prior candidate labels.
- `usun te strony` after broad published-pages inspection now maps to one `page.delete` action per previous candidate.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `bun --cwd core lint:types`
