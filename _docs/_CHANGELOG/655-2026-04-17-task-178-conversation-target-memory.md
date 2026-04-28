# 655. TASK-178 conversation target memory

Date: 2026-04-17
Version: unreleased
Tasks: TASK-178-06

## Key Changes

### Assistant/Core

- Added bounded planning state for `LLM Guide` follow-up prompts.
- Follow-ups such as `usun pierwszy` and `usun te dwa pierwsze` can reuse prior inspection candidates.
- Client-supplied state is advisory-only and is normalized before the planner re-resolves targets through trusted context.

### Admin/UI

- `AssistantPanel` now derives short-lived planning state from inspection plans and includes it in the next action planning request.

### Validation

- Added Vitest coverage for planning state normalization, expiry, redaction, planner follow-up resolution, and UI state forwarding.
- Revalidated assistant route smoke tests.
