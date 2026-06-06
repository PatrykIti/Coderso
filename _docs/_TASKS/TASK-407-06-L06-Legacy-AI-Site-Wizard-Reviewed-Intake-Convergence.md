# TASK-407-06-L06: Legacy AI Site Wizard Reviewed Intake Convergence
# FileName: TASK-407-06-L06-Legacy-AI-Site-Wizard-Reviewed-Intake-Convergence.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + Admin UI + Site Wizard
**Estimated Effort:** Large
**Dependencies:** TASK-407-06-L04, TASK-407-06-L05
**Status:** ⏳ To Do

---

## Overview

Reconcile the older `AiSiteWizard` manual siteKit flow with the reviewed
site-builder intake contract, or retire/redirect the legacy wizard entry point
so users cannot reach a divergent full-site builder handoff.

TASK-407-06-L04 completed the floating `LLM Guide` reviewed intake surface,
review hash binding, final summary, backend review-gate enforcement, and strict
`siteKit` action-plan handoff. The parent task still names the legacy
`AiSiteWizard` as a primary surface, so this leaf owns that remaining convergence
work instead of folding it silently into L04.

## Sub-Tasks

- Audit `core/admin/ui/setup/AiSiteWizard.tsx`,
  `AiSiteWizardSteps.tsx`, `aiSiteWizardValidation.ts`, and the siteKit helper
  calls in `core/admin/services/assistantClient.ts`.
- Decide whether the legacy wizard should embed the reviewed intake session
  flow, redirect users into the floating assistant intake, or be marked legacy
  and blocked from direct mutation.
- Ensure any remaining legacy dry-run/apply controls require the same reviewed
  normalized session hash, blocking-gate check, strict plan, dry-run, and backend
  execute authorization as the floating assistant intake.
- Keep stale cache, prompt-poisoning warnings, media/reference gates, and secret
  redaction behavior aligned with L04/L05.

## Security Contract

- Endpoint visibility: internal admin assistant/siteKit routes only.
- Auth model: existing admin session.
- RBAC: backend action contracts remain authoritative for write/publish
  permissions; UI state is advisory.
- CSRF: required for plan, dry-run, and execute POSTs.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: legacy wizard payloads must either reuse the strict
  reviewed intake request session or be removed from the executable path.
- Anti-abuse: no direct apply/dry-run from an unreviewed, stale, or
  blocking-gated wizard state; no arbitrary URL media import, code execution, or
  provider-supplied actions.
- Secret handling: no provider keys, cookies, CSRF tokens, signed URLs, raw
  reference text, upload bytes, or raw auth state in local/browser state,
  diagnostics, screenshots, or provider prompts.

## Implementation Pseudocode

```ts
function resolveLegacyWizardHandoff(state: AiSiteWizardState) {
  if (state.mode === "reviewed-intake") {
    const session = normalizeAssistantSiteBuilderIntakeSession(state.session);
    const summary = buildSiteBuilderIntakeReviewSummary(session.facts);
    if (!summary?.confirmationAllowed || !session.facts?.readyForExecution) {
      return { status: "blocked", gates: summary?.gates ?? [] };
    }
    return buildActionPlanRequestFromReviewedIntake(session);
  }

  return {
    status: "legacy_blocked",
    message: "Use the reviewed site-builder intake before applying a site kit.",
  };
}
```

## Data Flow and Error Handling

- Legacy wizard state must hydrate from server-normalized facts before any
  executable handoff.
- Any answer or kit-selection change after review invalidates the confirmation
  hash and returns the user to review.
- Blocking gates render as user-facing review items and prevent both dry-run and
  apply.
- If the wizard is retired, route/CTA copy must send users to the reviewed
  floating assistant intake without losing existing safe draft information.

## Testing Requirements

- Vitest UI tests for disabled legacy dry-run/apply before reviewed strict plan
  readiness.
- Tests proving stale hash, media-library, reference, and unsupported widget
  gates block the legacy path.
- Admin client tests proving no divergent executable siteKit payload bypasses
  the reviewed intake contract.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Relevant Bun runtime tests if any execute path is changed.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md` if the visible admin entry point changes.

## Acceptance Criteria

- There is one authoritative reviewed full-site builder handoff.
- Legacy wizard controls cannot dry-run/apply without the same reviewed session
  contract as the floating assistant intake.
- Any retired or redirected legacy path is documented and tested.
