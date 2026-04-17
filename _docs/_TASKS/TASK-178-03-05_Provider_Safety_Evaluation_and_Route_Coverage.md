# TASK-178-03-05: Provider Safety Evaluation and Route Coverage
# FileName: TASK-178-03-05_Provider_Safety_Evaluation_and_Route_Coverage.md

**Priority:** High
**Category:** QA/Assistant + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-178-03-02, TASK-178-03-03, TASK-178-03-04
**Status:** Done (2026-04-17)

---

## Overview

Add evaluation coverage that proves model-first planning is useful without becoming unsafe.

This specifically covers smaller reasoning models that should understand user intent but may return imperfect JSON or overconfident targets.

## Sub-Tasks

No child task files.

## Architecture

Build fake-provider fixtures for model-like outputs:

- correct operation draft,
- partially malformed JSON,
- wrong resource kind,
- invented resource id,
- overly broad destructive operation,
- docs question,
- prompt injection attempt,
- ambiguous follow-up.

Each fixture should assert the final planner outcome, not just provider output.

## Integration with Current Code

- Use existing fake provider interface from `providers/providerTypes`.
- Use `planAssistantActionsWithProviderDraft` or the route wrapper added in `TASK-178-03-03`.
- Keep fixtures in Vitest unless route permission behavior is being tested.
- Update route tests only for endpoint-level permission/fallback behavior.

## Files to Change

- `tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts`
- `tests/vitest/assistant/provider-planning-context.test.ts`
- `tests/integration/routes/assistant.test.ts`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`

## Acceptance Criteria

1. Smaller-model-style valid drafts produce expected inspection/action/needs-input plans.
2. Invented ids are rejected or re-resolved through server-side catalogs.
3. Broad destructive prompts return candidates/needs-input.
4. Malformed/unsafe provider output falls back safely.
5. Prompt injection attempts cannot create arbitrary actions or bypass review.

## Security Contract

- Visibility: test-only fixtures and internal route tests.
- Auth model: route tests use existing admin session harness.
- RBAC: route coverage proves read/write permissions still gate action planning/dry-run/execute.
- CSRF: route tests preserve existing CSRF behavior.
- Rate-limit bucket: `assistant` where route tests apply.
- Reject-unknown validation: malformed provider drafts fail closed.
- Anti-abuse: prompt injection, arbitrary tool requests, invented IDs, and broad deletion are covered.
- Secret handling: fixtures include fake secret-like values and assert redaction.

## Testing Requirements

- Vitest provider fixture suite.
- Bun route fallback/permission smoke where provider is enabled.
- Security regression assertions for unsafe drafts.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- task/changelog entries on completion

## Completion Notes (2026-04-17)

- Added provider fixtures for valid CMS operation drafts, broad destructive prompts, invented target ids, malformed JSON fallback, and unsafe action drafts.
- Provider fixtures assert final planner outcomes, not only provider output shape.
- Route smoke tests remain green for assistant action planning and permission paths.
