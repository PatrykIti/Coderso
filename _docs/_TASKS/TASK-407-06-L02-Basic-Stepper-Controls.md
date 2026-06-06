# TASK-407-06-L02: Basic Stepper Controls
# FileName: TASK-407-06-L02-Basic-Stepper-Controls.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + Basic Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-407-06-L01, TASK-407-03-L04
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06

---

## Overview

Build Basic-mode controls for nontechnical users. Controls must be structured
and driven by server-owned step definitions, not ad hoc prompt text.

## Sub-Tasks

- Add Basic mode start/selection UI with Basic as the default for broad full-site
  prompts.
- Render profile, goal, page, menu, hero, section, subpage, media, and review
  controls using appropriate inputs.
- Keep free text bounded and visually secondary to controlled options.
- Submit one structured answer at a time and rehydrate from server-normalized
  session state.

## Security Contract

- Endpoint visibility: no public endpoint.
- Auth model: existing admin session.
- RBAC: UI reflects backend capabilities but cannot grant permissions.
- CSRF: client POSTs use existing CSRF handling.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: UI option ids come from server registries; backend
  rejects any tampered payloads.
- Anti-abuse: UI cannot expose arbitrary action ids, widget aliases, raw HTML,
  remote media URLs, or unreviewed execute controls.
- Secret handling: local UI state must not store keys, cookies, auth state, raw
  references, signed URLs, or secret-like free text.

## Files To Change

| Area | Files |
|---|---|
| UI controls | `core/admin/ui/setup/AiSiteWizardSteps.tsx` or equivalent intake step components |
| Wizard integration | `core/admin/ui/setup/AiSiteWizard.tsx` |
| Assistant entry integration | `core/admin/ui/assistant/AssistantPanel.tsx` only if it starts/resumes the wizard |
| Tests | `tests/vitest/ui/assistant-site-builder-intake-basic.test.tsx` |

## Implementation Pseudocode

```tsx
function SiteBuilderIntakeBasicStepper({ session, onAnswer }: SiteBuilderIntakeStepperProps) {
  const step = resolveVisibleSiteBuilderIntakeStep(session);
  return (
    <SiteBuilderIntakeStepFrame step={step}>
      <SiteBuilderIntakeControlRenderer step={step} value={answerValue(session, step.id)} onAnswer={onAnswer} />
    </SiteBuilderIntakeStepFrame>
  );
}
```

## Data Flow and Error Handling

- Server step metadata drives controls; user changes submit structured answers.
- Server validation errors display beside the current step and do not advance
  the stepper.
- Dirty local edits survive background revalidation unless the server rejects or
  replaces the step schema.

## Testing Requirements

- ✅ UI tests for every Basic step control.
- ✅ Tests for validation error rendering and no step advance on rejection.
- ✅ Tests for Basic as default for broad nontechnical full-site prompts.
- ✅ Server route schema tests for strict `context.siteBuilderIntakeState`
  acceptance and tampered field rejection.
- ✅ Claude CLI read-only audit; non-blocking UX/robustness findings were fixed.
- ✅ `bun --cwd core lint`
- ✅ `bun --cwd core lint:types`
- ✅ `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` if user-visible Basic flow changes.

## Acceptance Criteria

- Basic UI is structured, beginner-safe, and registry-driven.
- User cannot choose unsupported ids through normal controls.
- Backend remains the validation authority.

## Completion Notes

- Added a Basic intake stepper in the floating assistant action-plan review
  path, driven only by `metadata.siteBuilderIntake.steps[].answerFields[]`.
- Wired one-step-at-a-time submit through the existing `/assistant/actions/plan`
  flow using `context.siteBuilderIntakeState.activeSession`; no new public
  endpoint or parallel route payload was added.
- Kept Basic answers in memory only. The request session strips derived facts
  before transport, and restored plans without answer state render a safe restart
  message instead of silently dropping prior answers.
- Filtered Basic metadata so Advanced-only fields are not rendered in Basic
  mode, and extended route validation to strictly accept known intake session
  keys/steps/answer fields while rejecting tampered values.
- Added friendly validation messages for client-side intake normalization errors
  so nontechnical users do not see raw domain error codes.
