# TASK-407-06: Admin UI Review and Prompt-Poisoning Hardening
# FileName: TASK-407-06-Admin-UI-Review-and-Prompt-Poisoning-Hardening.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + Admin UI + Security UX
**Estimated Effort:** Large
**Dependencies:** TASK-407-02, TASK-407-03, TASK-407-04, TASK-407-05
**Status:** 🚧 In Progress
**Started:** 2026-06-06

---

## Overview

Build the admin UX for the intake flow and harden the human review path. The UI
must make Basic mode approachable, Advanced mode discoverable but not noisy, and
the final review clear enough that users understand pages, menu, widgets,
content engines, custom screens, media policy, and gates before execution.

The original target surface was the existing AI site wizard under
`core/admin/ui/setup/AiSiteWizard.tsx` and `AiSiteWizardSteps.tsx`. L01-L04 now
complete the reviewed intake surface in the floating `LLM Guide` stepper and
backend planner. TASK-407-06-L06 owns the remaining legacy wizard convergence so
there is not a second full-site builder UI with a divergent plan handoff.

## Sub-Tasks

- Add site-builder intake UI states to the AI site wizard and assistant entry
  points without breaking existing docs/inspection/action-plan flows.
- Add Basic/Advanced mode controls, stepper progress, structured controls, and
  review summary.
- Disable dry-run/execute until the final reviewed intake session has produced a
  strict plan.
- Surface prompt-poisoning/reference warnings as user-facing gates without
  leaking raw suspicious text.
- Preserve SPA/cache/dirty-state behavior and keep assistant localStorage
  bounded and non-secret.

## Executable Leaves

| ID | Title | Status | Output |
|---|---|---|---|
| TASK-407-06-L01 | Site Builder Intake UI State Machine | Done | Explicit intake UI state reducer, server-session authority, stale-cache discard, and dry-run-before-execute gating. |
| TASK-407-06-L02 | Basic Stepper Controls | Done | Basic intake controls render from server metadata and submit one normalized answer through the existing plan route. |
| TASK-407-06-L03 | Advanced Stepper Controls | Done | Advanced server-owned progression, Basic-to-Advanced confirmation, controlled metadata-driven fields, selectable steps, and normalized-state gate tests. |
| TASK-407-06-L04 | Review Summary and Execution Gating | Done | Floating assistant final review summary, review-hash confirmation, backend blocking-gate enforcement, and strict siteKit plan handoff. |
| TASK-407-06-L05 | UI Warnings Local State and Redaction | Done | Prompt-poisoning-aware UI/cache redaction, conversation localStorage bounds, dirty revalidation preservation, and screenshot/cache regression tests. |
| TASK-407-06-L06 | Legacy AI Site Wizard Reviewed Intake Convergence | To Do | Reconcile or retire the legacy AI site wizard so it cannot bypass the reviewed intake handoff. |

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
| Site wizard UI | `core/admin/ui/setup/AiSiteWizard.tsx`, `core/admin/ui/setup/AiSiteWizardSteps.tsx`, `core/admin/ui/setup/aiSiteWizardValidation.ts` |
| Assistant entry UI | `core/admin/ui/assistant/AssistantPanel.tsx` only if full-site intent starts/resumes the wizard |
| Admin client | `core/admin/services/assistantClient.ts` siteKit request/response types and intake helpers |
| Tests | `tests/vitest/ui/assistant-*`, admin interaction tests |
| Docs | assistant docs if UX behavior changes |

## Implementation Pseudocode

```tsx
function AssistantSiteBuilderIntakePanel({ session, onAnswer }) {
  const step = resolveVisibleStep(session);
  return (
    <SiteBuilderIntakeStepper mode={session.mode} step={step}>
      <SiteBuilderIntakeStepControls step={step} value={session.answers[step.id]} onChange={onAnswer} />
      <SiteBuilderIntakeReviewSummary session={session} hidden={!session.readyForReview} />
    </SiteBuilderIntakeStepper>
  );
}

function canSubmitPlan(session: AssistantSiteBuilderIntakeSession) {
  return session.readyForReview && session.confirmedReview && !session.securityWarnings.blocking;
}
```

## Data Flow and Error Handling

- Admin UI renders the current server-normalized session, lets the user answer
  one intake step, and rehydrates from the returned normalized session.
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

## Progress Notes

- 2026-06-06: TASK-407-06-L01 completed the shared intake UI reducer and tests.
  Remaining leaves still need to wire Basic/Advanced controls, review rendering,
  warning presentation, and browser-local redaction behavior into the live admin
  UI.
- 2026-06-06: TASK-407-06-L02 completed Basic stepper controls, strict route
  schema support for intake session context, friendly validation errors, and a
  Claude read-only UX/security audit pass. Remaining leaves still need Advanced
  controls, final review/execution gating, warning rendering, and broader
  browser-local redaction behavior.
- 2026-06-06: TASK-407-06-L03 completed Advanced `needs_input` progression,
  metadata-driven Advanced controls, explicit Basic-to-Advanced confirmation,
  selectable optional steps, real normalized layout/reference review tests,
  docs, changelog, and a Claude audit loop. Remaining leaves still need final
  review/execution gating and full warning/local-state redaction behavior.
- 2026-06-06: TASK-407-06-L04 completed final review summary rendering in the
  floating assistant intake, session-hash confirmation, stale-review
  invalidation, backend review-summary gate enforcement before `siteKit`
  compilation, strict action-plan handoff, targeted Vitest/Bun/runtime
  validation, and Claude/subagent drift review. The audit identified the legacy
  `AiSiteWizard` surface as a remaining divergent handoff; TASK-407-06-L06 owns
  that convergence explicitly.
- 2026-06-06: TASK-407-06-L05 completed prompt-poisoning-aware UI/cache
  redaction, bounded assistant conversation localStorage, screenshot-safe review
  warnings, and dirty-draft preservation for background revalidation. Remaining
  TASK-407-06 work is legacy `AiSiteWizard` reviewed-intake convergence in L06.
