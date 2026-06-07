# TASK-407-06-L03: Advanced Stepper Controls
# FileName: TASK-407-06-L03-Advanced-Stepper-Controls.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + Advanced Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-407-06-L02, TASK-407-04-L04
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06

---

## Overview

Build Advanced-mode controls for design presets, menu/hero/section variants,
and reviewed reference design briefs. Advanced mode must remain controlled and
must not become a free-form execution prompt.

## Sub-Tasks

- [x] Add mode switching from Basic to Advanced with explicit confirmation when it
  exposes additional controls.
- [x] Render design preset, menu behavior, hero variant, section variant, CTA, and
  reference brief controls from server-owned option metadata.
- [x] Show reachable Advanced layout gates and reference review-required state;
  reviewed reference warning transport remains in TASK-407-06-L05.
- [x] Submit Advanced answers through the same structured session contract.

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

- [x] UI tests for mode switch, preset controls, menu/hero/section controls, and
  reference review-required state.
- [x] Tests for unsupported/reference-gated states and no raw warning leakage.
- [x] Tests that Advanced uses the same session contract as Basic.
- [x] `bun --cwd core lint`
- [x] `bun --cwd core lint:types`
- [x] `git diff --check`

## Documentation Updates Required

- [x] `_docs/ASSISTANT_SITE_BUILDER.md` if Advanced UX behavior changes.

## Acceptance Criteria

- [x] Advanced UI exposes controlled choices only.
- [x] Reference briefs are reviewable and sanitized.
- [x] Advanced mode cannot bypass structured validation.

## Completion Notes

- Added `assistantSiteBuilderIntakeAdvancedFlow.ts` and shared intake field
  metadata helpers so Advanced needs-input plans are server-owned.
- Generalized the floating LLM Guide intake stepper for Basic and Advanced,
  including explicit Basic-to-Advanced confirmation and selectable step chips.
- Added real normalized-state UI tests for Advanced layout gates and reference
  review-required presentation; full reviewed reference warning transport stays
  with TASK-407-06-L05.
- Validation:
  - `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedFlow.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/ui/assistant-site-builder-intake-advanced.test.tsx tests/vitest/ui/assistant-site-builder-intake-basic.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
  - `bun test tests/unit/server/schemaValidator.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
  - `git diff --check`
  - Claude CLI read-only audit loop, no remaining blocking or medium findings.
