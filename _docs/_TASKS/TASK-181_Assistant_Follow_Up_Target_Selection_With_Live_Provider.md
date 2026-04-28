# TASK-181: Assistant Follow-Up Target Selection With Live Provider
# FileName: TASK-181_Assistant_Follow_Up_Target_Selection_With_Live_Provider.md

**Priority:** High
**Category:** Assistant/Core + Planning State
**Estimated Effort:** Small
**Dependencies:** TASK-178-06, TASK-180
**Status:** Done (2026-04-18)

---

## Overview

Fix `LLM Guide` follow-up target selection when a real provider is available.

Observed flow:

1. User asks for published pages with `test` in title/name.
2. Assistant surfaces matching page candidates.
3. User asks to delete published pages with `test`.
4. Assistant asks for confirmation because two candidates matched.
5. User replies: `tak, to te dwie, usun je`.
6. Provider path interpreted that text as a fresh target query (`tak, to te dwie`) instead of reusing previous planning state.

The fix is to prefer bounded planning-state follow-up resolution before calling the provider. The provider should not override a safe local follow-up selection such as `te dwie`, `oba`, `pierwszy`, or `these`.

## Sub-Tasks

No child task files.

## Files Changed

- `core/services/assistant/actionPlannerService.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: unchanged; planning state remains advisory and execute still enforces permissions.
- CSRF: unchanged assistant action route CSRF.
- Rate-limit bucket: existing `assistant`.
- Reject-unknown validation: planning state still passes `normalizeAssistantPlanningState`.
- Anti-abuse:
  - provider is skipped only when local bounded planning state can produce a reviewed typed plan,
  - destructive follow-ups still produce reviewable actions and require dry-run/execute confirmation.
- Secret handling: no provider payloads, secrets, cookies, CSRF tokens, or form submissions are stored or emitted.

## Testing Requirements

- Vitest planner regression:
  - provider is not called for `tak, to te dwie, usun je` when prior page candidates are available,
  - generated plan contains two `page.delete` typed actions.
- Validation:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-planning-state.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Completion Notes (2026-04-18)

- `planAssistantActionsWithProviderDraft` now checks planning-state follow-up resolution before invoking the configured provider.
- Added regression coverage for confirmed two-page delete follow-up with provider available.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-planning-state.test.ts`
