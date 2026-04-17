# TASK-179-08: Assistant Conversation State Persistence
# FileName: TASK-179-08_Assistant_Conversation_State_Persistence.md

**Priority:** High
**Category:** Assistant/Admin UI + Conversation UX
**Estimated Effort:** Medium
**Dependencies:** TASK-179, TASK-178-06
**Status:** Done (2026-04-17)

---

## Overview

Persist the assistant conversation window state across close/minimize and SPA route transitions.

Observed problem:

1. User has an active assistant conversation and result/plan state.
2. User closes/minimizes the assistant window.
3. User navigates to another admin screen such as `Screens`.
4. User opens the assistant again.
5. The conversation appears to reload/reset instead of preserving the previous transcript/state.

This hurts multi-step `LLM Guide` work because the user loses context, active plan, previous inspection candidates, and follow-up target memory.

## Sub-Tasks

No child task files.

## Architecture

Persist bounded assistant UI conversation state client-side:

- messages/transcript,
- active plan id/summary plus safe plan payload where needed,
- active preview/execution state where safe,
- planning state from `cmsPlanningState.ts`,
- current mode,
- conversation width/open state if already tracked.

State must be scoped to admin user/session/browser context and must expire. It must not store secrets, provider raw responses, API keys, CSRF tokens, cookies, form submissions, or privileged settings.

The implementation should prefer a small local helper such as `assistantConversationState.ts` rather than scattering localStorage reads/writes throughout `AssistantPanel`.

## Integration with Current Code

- Extend `core/admin/ui/assistant/AssistantPanel.tsx`.
- Reuse existing launcher position persistence pattern only where appropriate.
- Reuse `normalizeAssistantPlanningState`.
- Preserve current runtime status cache behavior; do not force assistant status re-fetch when restoring transcript.
- Keep `AssistantMessage`, `ActionPlanReview`, and `ActionExecutionResult` as renderers.
- Do not persist raw provider prompt packages or hidden source snippets.

## Files to Change

- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/assistantConversationState.ts` (new)
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`

## Acceptance Criteria

1. Closing/reopening the assistant preserves the current transcript.
2. Navigating between admin screens in the SPA preserves assistant transcript and active read-only/action state.
3. Previous inspection planning state survives close/reopen until expiry and can support follow-up prompts.
4. Expired or malformed persisted state is ignored safely.
5. Persisted state is bounded and redacted; no secrets or raw provider data are stored.
6. No additional backend requests are made solely because the assistant window is reopened with valid cached state.

## Security Contract

- Visibility: browser-local admin UI state only.
- Auth model: existing admin session; persisted state is advisory UI state, not authorization.
- RBAC: restored plans cannot execute without current backend dry-run/execute permission checks.
- CSRF: no CSRF token persistence.
- Rate-limit bucket: no new backend request on restore.
- Reject-unknown validation: persisted state schema rejects unknown/malformed fields.
- Anti-abuse:
  - persisted plans are not trusted for backend mutation,
  - execute still sends through `/assistant/actions/execute`,
  - stale state expires.
- Secret handling:
  - do not persist cookies, CSRF tokens, provider keys, raw provider prompts, form submissions, access logs, or secret-like settings.

## Testing Requirements

- Vitest helper tests for state normalize/expiry/redaction.
- UI interaction test:
  - create an inspection result,
  - close assistant,
  - navigate route,
  - reopen assistant,
  - verify transcript and inspection candidates remain,
  - verify follow-up prompt includes planning state.
- Regression that malformed persisted state is ignored.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-04-17)

- Added bounded browser-local assistant conversation persistence.
- Restores transcript, active plan/preview/execution when safe, planning state, and assistant mode across close/remount.
- Persisted state expires and rejects malformed or secret-like payloads.
- Assistant panel can restore conversation after SPA route remount without re-calling the planner.
- Restored conversations render without blocking behind the runtime loading placeholder.
- Added helper and UI interaction coverage.
