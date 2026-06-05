# TASK-407-06: Admin UI Review and Prompt-Poisoning Hardening
# FileName: TASK-407-06-Admin-UI-Review-and-Prompt-Poisoning-Hardening.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + Admin UI + Security UX
**Estimated Effort:** Large
**Dependencies:** TASK-407-02, TASK-407-03, TASK-407-04, TASK-407-05
**Status:** ⏳ To Do

---

## Overview

Build the admin UX for the guided flow and harden the human review path. The UI
must make Basic mode approachable, Advanced mode discoverable but not noisy, and
the final review clear enough that users understand pages, menu, widgets,
content engines, custom screens, media policy, and gates before execution.

## Sub-Tasks

- Add guided-intake UI states to the assistant panel without breaking existing
  docs/inspection/action-plan flows.
- Add Basic/Advanced mode controls, stepper progress, structured controls, and
  review summary.
- Disable dry-run/execute until the final reviewed guided session has produced a
  strict plan.
- Surface prompt-poisoning/reference warnings as user-facing gates without
  leaking raw suspicious text.
- Preserve SPA/cache/dirty-state behavior and keep assistant localStorage
  bounded and non-secret.

## Executable Leaves

| ID | Title | Status | Output |
|---|---|---|---|
| TASK-407-06-L01 | Guided Assistant Panel State Machine | To Do | Guided UI state transitions without breaking existing assistant flows. |
| TASK-407-06-L02 | Basic Stepper Controls | To Do | Basic-only controls bound to server-normalized session state. |
| TASK-407-06-L03 | Advanced Stepper Controls | To Do | Advanced controls, preset selection, and reference brief display. |
| TASK-407-06-L04 | Review Summary and Execution Gating | To Do | Final review, disabled dry-run/execute states, confirmation, and plan handoff. |
| TASK-407-06-L05 | UI Warnings Local State and Redaction | To Do | Warning/gate rendering, localStorage bounds, stale cache discard, and redaction tests. |

## Security Contract

- Endpoint visibility: no public endpoint.
- Auth model: existing admin session.
- RBAC: UI must reflect backend availability and permissions but not trust
  client-side permission checks for execution.
- CSRF: unchanged backend POST protection.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: UI can build structured payloads, but backend
  remains the enforcement point.
- Anti-abuse: UI must not show controls that imply unsupported direct code,
  upload, arbitrary URL import, or unreviewed execution.
- Secret handling: localStorage/session UI state must not store keys, cookies,
  CSRF tokens, raw files, signed URLs, or raw auth state.

## Files To Change

| Area | Files |
|---|---|
| Assistant UI | `core/admin/ui/assistant/AssistantPanel.tsx`, new guided-intake components |
| Admin client | assistant client/request types if `siteBuilderGuide` is added |
| Tests | `tests/vitest/ui/assistant-*`, admin interaction tests |
| Docs | assistant docs if UX behavior changes |

## Implementation Pseudocode

```tsx
function GuidedSiteBuilderPanel({ session, onAnswer }) {
  const step = resolveVisibleStep(session);
  return (
    <GuidedStepper mode={session.mode} step={step}>
      <GuidedStepControls step={step} value={session.answers[step.id]} onChange={onAnswer} />
      <GuidedReviewSummary session={session} hidden={!session.readyForReview} />
    </GuidedStepper>
  );
}

function canSubmitPlan(session: GuidedSiteBuilderSession) {
  return session.readyForReview && session.confirmedReview && !session.securityWarnings.blocking;
}
```

## Data Flow and Error Handling

- Admin UI renders the current server-normalized session, lets the user answer
  one guided step, and rehydrates from the returned normalized session.
- The review summary is derived from normalized facts; execute controls stay
  disabled until review confirmation and no blocking warning remains.
- Dirty local edits are preserved during background revalidation, but stale or
  schema-incompatible cached state is discarded instead of overwriting server
  truth.
- Prompt-poisoning warnings, rejected reference fields, unsafe media gates, and
  secret redaction are visible to the user without exposing secrets in
  localStorage, debug payloads, screenshots, or provider prompts.

## Testing Requirements

- UI tests for Basic and Advanced mode switching.
- UI tests for step progression, disabled execute before review, dirty-state
  preservation, warning/gate rendering, and localStorage redaction.
- Interaction tests for follow-up refinement entry points.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.

## Documentation Updates Required

- `docs/develop/assistant.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`

## Acceptance Criteria

- Basic mode is the default and does not overwhelm nontechnical users.
- Advanced controls are available without weakening structured validation.
- Review clearly explains what will be created and what remains gated.
