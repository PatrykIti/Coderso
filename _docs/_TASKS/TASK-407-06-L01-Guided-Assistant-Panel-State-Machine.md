# TASK-407-06-L01: Guided Assistant Panel State Machine
# FileName: TASK-407-06-L01-Guided-Assistant-Panel-State-Machine.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + Admin UI State
**Estimated Effort:** Large
**Dependencies:** TASK-407-02-L04
**Status:** ⏳ To Do

---

## Overview

Add the admin UI state machine for guided site-builder sessions without
breaking existing docs, inspection, chat, or action-plan flows.

## Sub-Tasks

- Add guided session UI state types and reducer/actions.
- Add transitions for start, resume, answer step, server-normalized rehydrate,
  review-ready, planning, dry-run, execute, cancel, and reset.
- Preserve existing assistant panel entry points and conversation behavior.
- Ensure server-normalized session state wins over stale client state.

## Security Contract

- Endpoint visibility: no public endpoint; UI talks to existing internal admin
  assistant routes.
- Auth model: existing admin session.
- RBAC: UI may display availability but backend remains enforcement point.
- CSRF: existing client POST flow must continue to send CSRF protection.
- Rate-limit bucket: `assistant` on backend.
- Reject unknown validation: UI state may construct structured payloads, but
  backend service/route schemas remain authoritative.
- Anti-abuse: UI state cannot skip review, dry-run, execute confirmation, media
  gates, or server validation.
- Secret handling: UI state must not store provider keys, cookies, auth state,
  raw file bytes, signed URLs, or secret-like prompt/reference text.

## Files To Change

| Area | Files |
|---|---|
| UI state | `core/admin/ui/assistant/AssistantPanel.tsx`, new guided state hook/reducer files |
| Client types | assistant client/context types if needed |
| Tests | `tests/vitest/ui/assistant-guided-state.test.tsx` |

## Implementation Pseudocode

```tsx
type GuidedUiState =
  | { kind: "idle" }
  | { kind: "answering"; session: GuidedSiteBuilderSession }
  | { kind: "review"; session: GuidedSiteBuilderSession }
  | { kind: "planning"; session: GuidedSiteBuilderSession }
  | { kind: "readyPlan"; planId: string; session: GuidedSiteBuilderSession };

function guidedAssistantReducer(state: GuidedUiState, event: GuidedUiEvent): GuidedUiState {
  if (event.type === "server_session_received") return hydrateFromServer(event.session);
  if (event.type === "stale_cache_detected") return { kind: "idle" };
  return transitionGuidedState(state, event);
}
```

## Data Flow and Error Handling

- UI events update local reducer state, then server responses rehydrate the
  canonical normalized session.
- Network errors, stale cached sessions, schema-version mismatches, and rejected
  answers produce visible non-executing states.
- Existing assistant flows remain reachable and must not be converted to guided
  mode unless full-site intent is detected or user chooses it.

## Testing Requirements

- UI reducer tests for transitions and stale cache discard.
- Regression tests that existing assistant docs/action-plan flows still render.
- Tests that execute/dry-run states are unreachable before server plan readiness.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `docs/develop/assistant.md` if UI flow architecture changes.

## Acceptance Criteria

- Guided UI state is explicit and test-covered.
- Existing assistant panel flows still work.
- Server-normalized session state is authoritative.
