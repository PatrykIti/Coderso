# TASK-407-06-L03: Advanced Stepper Controls
# FileName: TASK-407-06-L03-Advanced-Stepper-Controls.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + Advanced Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-407-06-L02, TASK-407-04-L04
**Status:** ⏳ To Do

---

## Overview

Build Advanced-mode controls for design presets, menu/hero/section variants,
and reviewed reference design briefs. Advanced mode must remain controlled and
must not become a free-form execution prompt.

## Sub-Tasks

- Add mode switching from Basic to Advanced with explicit confirmation when it
  exposes additional controls.
- Render design preset, menu behavior, hero variant, section variant, CTA, and
  reference brief controls from server-owned option metadata.
- Show reference design brief warnings and review-required state.
- Submit Advanced answers through the same structured session contract.

## Security Contract

- Endpoint visibility: no public endpoint.
- Auth model: existing admin session.
- RBAC: UI reflects backend media/reference availability but cannot grant media
  read or write permissions.
- CSRF: client POSTs use existing CSRF handling.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: Advanced option ids and reference ids are validated
  by backend schemas.
- Anti-abuse: UI must not expose arbitrary CSS, raw HTML, remote media import,
  direct code, plugin write, or unreviewed execution paths.
- Secret handling: local UI state must not store raw file bytes, signed URLs,
  EXIF/OCR secrets, cookies, tokens, provider keys, or raw suspicious text.

## Files To Change

| Area | Files |
|---|---|
| UI controls | `core/admin/ui/setup/AiSiteWizardSteps.tsx` or equivalent intake step components |
| Reference UI | reference brief/warning components |
| Tests | `tests/vitest/ui/assistant-site-builder-intake-advanced.test.tsx` |

## Implementation Pseudocode

```tsx
function SiteBuilderIntakeAdvancedStepper({ session, optionCatalog, onAnswer }: SiteBuilderIntakeAdvancedProps) {
  return (
    <SiteBuilderIntakeStepper mode="advanced">
      <DesignPresetControl options={optionCatalog.designPresets} value={session.facts.visual.presetId} />
      <LayoutOptionControls options={optionCatalog.layoutOptions} />
      <ReferenceBriefReview brief={session.facts.referenceBrief} warnings={session.securityWarnings} />
    </SiteBuilderIntakeStepper>
  );
}
```

## Data Flow and Error Handling

- Server-owned catalogs render Advanced controls; submitted answers are
  normalized by backend schemas.
- Rejected option/reference payloads display blocking warnings and keep execute
  disabled.
- Reference brief warnings are shown as redacted summaries, not raw file text.

## Testing Requirements

- UI tests for mode switch, preset controls, menu/hero/section controls, and
  reference brief warnings.
- Tests for unsupported/reference-gated states and no raw warning leakage.
- Tests that Advanced uses the same session contract as Basic.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` if Advanced UX behavior changes.

## Acceptance Criteria

- Advanced UI exposes controlled choices only.
- Reference briefs are reviewable and sanitized.
- Advanced mode cannot bypass structured validation.
