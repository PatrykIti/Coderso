# TASK-178-08: Review UX, Docs, Gates, and Closure
# FileName: TASK-178-08_Review_UX_Docs_Gates_and_Closure.md

**Priority:** High
**Category:** Admin/UI + Docs + QA/Assistant
**Estimated Effort:** Medium
**Dependencies:** TASK-178-01, TASK-178-02, TASK-178-03, TASK-178-04, TASK-178-05, TASK-178-06, TASK-178-07
**Status:** To Do

---

## Overview

Close the generic CMS reasoning wave with UI states, docs, release gates, and validation coverage aligned to the expanded `LLM Guide` contract.

The user-facing experience must make the difference clear between:

- read-only resource inspection,
- target clarification,
- ready reviewed mutation,
- blocked/gated operation,
- executed action results.

## Sub-Tasks

No child task files.

## Architecture

Update the assistant review UI and docs so `LLM Guide` is described as:

`understand intent -> resolve trusted target -> propose typed plan -> dry-run -> user approval -> execute`

The UI must not show dry-run/execute buttons for read-only inspection plans. It must show candidate lists and clarification affordances when target resolution is ambiguous.

Docs must stop implying that supported behavior is limited to blueprint setup or one-off action branches.

## Integration with Current Code

- Keep `ActionPlanReview.tsx` as the shared review renderer and extend its states.
- Keep `ActionExecutionResult.tsx` for execution outcomes; do not add a separate result panel for generic CMS operations.
- Update `AssistantPanel.tsx` to pass read-only/candidate plan metadata through the existing active plan state.
- Update docs and gates to describe the same `/assistant/actions/*` flow used by setup packs and resource operations.
- Closure must verify that `TASK-178` did not leave duplicate planner paths or stale docs that describe old limits.

## Files to Change

- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx` only if result summaries need labels
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- relevant `docs/` assistant corpus pages
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. UI clearly separates read-only inspection, candidate clarification, ready mutation, blocked/gated mutation, and execution results.
2. Dry-run/execute controls are unavailable for read-only and gated plans.
3. Docs describe one extensible LLM Guide flow across CMS operations.
4. Acceptance matrix lists generic CMS planning coverage and remaining gaps.
5. Targeted lint/type/test gates from touched layers pass or are documented with clear blockers.

## Security Contract

- Visibility: internal admin UI and assistant action endpoints.
- Auth model: existing admin session.
- RBAC: no UI state may imply execution is possible until route/action permissions pass.
- CSRF: existing assistant action POST CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: UI cannot submit mutated plans that fail strict schema.
- Anti-abuse:
  - destructive operations remain review-first,
  - read-only plans cannot execute,
  - blocked/gated operations cannot execute.
- Secret handling: UI redaction continues for secret-like text in summaries, warnings, and results.

## Testing Requirements

- Vitest UI tests for:
  - read-only plan rendering,
  - candidate clarification,
  - ready destructive review,
  - blocked/gated state.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Relevant Bun route/executor tests for touched contracts.
- Release gate updates if the generic planner changes gate expectations.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md` if gates change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and final changelog entries
