# TASK-292-04: Toggle Block Editor Mode Flow, Variant Previews, and Reset UX

# FileName: TASK-292-04_Toggle_Block_Editor_Mode_Flow_Variant_Previews_and_Reset_UX.md

**Priority:** High
**Category:** Widgets + Admin UI + Editor UX + Playwright QA
**Estimated Effort:** Large
**Dependencies:** TASK-292, TASK-292-01, TASK-256-02, TASK-256-05-04
**Status:** Done (2026-05-22)

---

## Overview

Make the Toggle Block editor modes meaningfully different and beginner-safe by
adding variant previews, a clearer Wizard flow, reset defaults, and active
default-state feedback.

This leaf improves editor UX. It must consume shared TASK-256 controls for
Clear/color behavior instead of inventing a one-off picker. The shared
color/token control already exists on the current base and should replace the
current raw-only Toggle Block inputs.

## Source Evidence

- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:99-118` reports missing
  variant previews, shallow Wizard coverage, duplicated Variant blocks, and
  color picker/token-list gaps.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:120-122` reports the missing
  reset-to-defaults action.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:129-132` reports unclear
  active/default pane state in editor preview.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:139-181` records Admin UI
  testing for Wizard, Visual, and Advanced mode behavior.

## Scope

- Add compact visual thumbnails to `VariantCards` for `switch` and `cards`.
- Make Wizard read like a guided setup path, for example ordered sections for
  variant, labels, and default pane, without adding misleading multi-step state
  if the repo has no wizard-step pattern.
- Keep Visual focused on common authoring controls.
- Keep Advanced focused on diagnostics plus advanced style/accessibility fields.
- Add a reset-to-defaults action that uses normalized defaults and asks for
  confirmation or an undo-safe local pattern if destructive.
- Add a visible active/default-state preview indicator in the editor.
- Use the existing shared color/token controls and clear helpers instead of
  keeping raw-only local inputs.
- Keep editor-only automation metadata on the existing `data-widget-editor*`
  and `data-widget-control` contract or accessible roles/names; reserve
  `data-coderso-*` for runtime markers owned by TASK-256.

## Out of Scope

- Replacing the global editor mode framework.
- Weakening React Hooks Compiler rules or adding effect-driven sync loops.
- Generic color picker implementation; TASK-256 owns that shared contract.
- Helper clear/visibility sentinel repair; TASK-256 owns it.

## Sub-Tasks

- [x] Add compact previews to the `switch` and `cards` variant cards.
- [x] Split Wizard, Visual, and Advanced ownership so repeated sections are
  intentional and not redundant.
- [x] Add a deliberate reset-to-defaults action using normalized defaults.
- [x] Add active/default pane messaging in the editor.
- [x] Adopt final TASK-256 color/token controls only through the shared helper.
- [x] Add editor-focused tests and update docs/report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | Add variant thumbnails, mode-specific control grouping, reset defaults, active/default-state messaging, and shared color-control adoption if available. |
| `core/widgets/core/toggleBlock.tsx` | Export or centralize any defaults/reset helper needed by editor tests without coupling to runtime. |
| `tests/vitest/ui/toggle-block-editor-wave.test.tsx` | Cover variant previews, Wizard/Visual/Advanced differences, reset flow, active/default-state messaging, and shared control adoption. |
| `tests/vitest/widgets/toggleBlock.test.tsx` | Cover any new reset/default helper and schema/default behavior. |
| `_docs/_WIDGETS/TOGGLE_BLOCK.md` | Document editor mode ownership and reset behavior. |
| `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` | Record fixed/deferred status for editor UX rows. |

## Implementation Pseudocode

```tsx
function ToggleBlockVariantPreview({ variant }: { variant: ToggleBlockVariantId }) {
  return (
    <span
      aria-hidden="true"
      className={variant === "cards" ? "grid rounded-md border p-2" : "rounded-full border p-1"}
      data-widget-control={`toggle-block.variant-preview.${variant}`}
    >
      <span className={variant === "cards" ? "rounded-sm border p-1" : "rounded-full border"} />
      <span className={variant === "cards" ? "rounded-sm border p-1" : "rounded-full border"} />
    </span>
  );
}

function resetToggleBlockData(): ToggleBlockData {
  return normalizeToggleBlockData(toggleBlockDefaults);
}

function ToggleBlockDefaultStateNotice({ value }: { value: ToggleBlockData }) {
  const normalized = normalizeToggleBlockData(value);
  const state = normalized.options?.defaultState === "secondary" ? "Secondary" : "Primary";
  return <p data-widget-control="toggle-block.default-state.preview">{state} pane is shown first.</p>;
}
```

Data flow:

1. Reuse existing `updateLabels`, `updateOptions`, and `updateStyle` helpers for
   field changes.
2. Add reset through a single helper that returns normalized defaults.
3. Keep mode-specific sections declarative; avoid effect-based state mirroring.
4. Render thumbnails from bounded variant IDs only.

Error handling:

- Missing `onVariantChange` keeps buttons non-destructive and leaves variant
  unchanged.
- Reset must be explicit enough to avoid accidental data loss.
- Unknown variant still falls back to `switch`.

Regression-test shape:

- Editor tests cover thumbnails, Wizard/Visual/Advanced ownership, and active
  default-state messaging without duplicated sections.
- Reset tests prove the action writes normalized defaults and follows the
  repository's confirmation or undo-safe pattern.
- Shared-control tests prove TASK-256 color/token helpers are imported when
  adopted and no local color picker is introduced.
- Automation tests use existing `data-widget-editor*` / `data-widget-control`
  markers or accessible roles/names instead of adding editor-local
  `data-coderso-*` attributes.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model, RBAC, CSRF, and rate limits: unchanged.
- Reject-unknown validation: unchanged unless this leaf adds persisted fields.
- Anti-abuse: reset and preview UI must not render raw HTML, scripts, or
  untrusted classes from widget data.
- Secret handling: diagnostics must not add secrets or privileged config.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` only if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TOGGLE_BLOCK.md` with final mode ownership and reset
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` with fixed/deferred
  status for variant preview, Wizard, duplicated Variant, color-control, reset,
  and active-state rows.

## Acceptance Criteria

- Variant options have visual previews.
- Wizard, Visual, and Advanced have clear, non-duplicative ownership.
- Reset defaults is deliberate and tested.
- The editor clearly communicates which pane is shown by default.
- Shared TASK-256 color/clear controls are consumed rather than duplicated.
