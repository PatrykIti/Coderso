# TASK-174-05-02: Page Instance vs Template Target Resolution
# FileName: TASK-174-05-02_Page_Instance_vs_Template_Target_Resolution.md

**Priority:** High
**Category:** Assistant/Planning + Widget Templates
**Estimated Effort:** Medium
**Dependencies:** TASK-174-05-01
**Status:** Done (2026-04-14)

---

## Overview

Teach the planner to ask whether a requested widget edit should affect only the current page instance or the reusable widget template when both are possible.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanHeuristics.ts`
- `core/services/assistant/providerPlanningContext.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Security Contract

- Visibility: internal planner behavior only.
- Auth model: existing admin session.
- RBAC: read-only planning context; execute later requires proper write permission.
- CSRF: plan route remains POST + CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: no new unvalidated payload.
- Anti-abuse: ambiguous target returns `needs_input`.
- Idempotency: not applicable.
- Secret handling: no raw template/page data in questions.

## Testing Requirements

- Vitest:
  - ambiguous prompt returns page-instance vs reusable-template question,
  - explicit "only this page" picks page target,
  - explicit "template everywhere" picks template target when supported.
- Bun:
  - none unless route context shape changes.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Ambiguous template-section edits ask a clear target question.
2. Explicit prompts route to the correct page/template target.
3. No mutation is planned before ambiguity is resolved.

## Progress Notes

- 2026-04-14: Completed page instance vs reusable template target resolution. The planner now asks a target question for ambiguous template-backed page block edits, routes explicit page-instance prompts to `page.widget.patch`, and routes explicit reusable-template prompts to server-hydrated `widget-template.block.patch` when one supported referenced template block is resolved.
- 2026-04-14: Validation passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/template-section-references.test.ts tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/active-surface-hydration.test.ts`
