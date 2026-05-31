# TASK-327: Shared Color Swatch Token Preservation Residual

# FileName: TASK-327_Shared_Color_Swatch_Token_Preservation_Residual.md

**Priority:** High
**Category:** Shared Widgets + Admin UI + Editor Controls
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-283
**Status:** Done (2026-05-23)

---

## Overview

Reopen the shared color-control residual that still exists in
`SharedColorFieldInputs`: CSS variable or custom token text remains visible in
editor inputs, but swatch changes still flow through the generic `onChange`
path and replace that token with a hex value.

This task owns the shared helper fix so widget-local families such as TASK-283
can route evidence here instead of patching the behavior inside one widget.

## Scope Boundary

In scope:

- make shared swatch interactions truthful when the current text value is a CSS
  variable, token, or other non-picker-native color string;
- keep explicit hex/rgb picker writes working for picker-compatible values;
- add focused shared tests for the token-preservation path and any explicit
  picker override contract;
- update the task/report ownership in families that currently rediscover this
  shared drift.

Out of scope:

- widget-local style field adoption work that belongs to TASK-283 or other
  widget families;
- duplicated Advanced ownership cleanup, which stays with owner tasks such as
  TASK-326;
- arbitrary color parsing beyond the current shared clearable-field contract.

## Source Findings

- `_docs/_TASKS/TASK-256-02_Clear_None_Token_and_Design_Token_Controls.md:24,73-74,246` - the original shared contract already required swatches to preserve CSS variable tokens.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:85` - Section still reports border-color token loss through the color picker.
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:73` - Divider reports the same shared token-loss behavior.
- `core/admin/ui/widgets/editors/ClearableFields.tsx:271-312` - `SharedColorFieldInputs` currently routes picker changes through `onChange` by default.
- `tests/vitest/ui/clearable-fields.test.tsx:97-101,188-216` - shared tests currently prove fallback swatch display for tokens, but not protection against token-destructive swatch writes.

## Sub-Tasks

- [ ] Define the shared swatch-write contract for token/custom-text values so picker interactions do not silently destroy text tokens.
- [ ] Update `SharedColorFieldInputs` to preserve token/custom text unless the consumer opts into an explicit picker replacement path.
- [ ] Add focused shared tests for CSS-variable token preservation, explicit picker writes for hex/rgb values, and any additive override callback.
- [ ] Update the Section task/report ownership docs to route this drift to TASK-327 instead of closed TASK-256 owners.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Make shared color swatch writes truthful for CSS-variable/token values and expose an additive explicit picker-write seam only if needed. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Add shared regression coverage for token-preserving swatch behavior and explicit picker writes. |
| `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` | Route the Section copy of this drift to `TASK-327`. |
| `_docs/_TASKS/TASK-283_Section_Widget_Playwright_Product_Followups.md` | Keep the Section shared-exclusion matrix truthful after the reopened shared task split. |
| `_docs/_TASKS/README.md` | Add the new shared task row and update statistics. |

## Implementation Pseudocode

```tsx
function handleSharedColorPickerChange({
  currentValue,
  nextHex,
  onChange,
  onPickerChange,
}: {
  currentValue: string | undefined;
  nextHex: string;
  onChange: (next: string) => void;
  onPickerChange?: (next: string) => void;
}) {
  if (onPickerChange) {
    onPickerChange(nextHex);
    return;
  }

  if (!currentValue || isPickerRepresentableColor(currentValue)) {
    onChange(nextHex);
    return;
  }

  // Token/custom text remains authoritative unless the consumer opts into
  // an explicit replacement path.
}
```

Error handling:

- Do not patch the behavior only in `SectionEditors.tsx`; the helper owns the
  swatch/text contract.
- Preserve current text input authority for CSS variables and custom tokens.
- Keep the fix additive so existing widget editors that already pass an explicit
  `onPickerChange` callback can continue to opt into deliberate replacement when
  that contract is truly desired.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged; this task changes only shared editor
  behavior, not persisted schemas.
- Anti-abuse: no raw CSS injection, scripts, or hidden editor-only persistence.
- Secret handling: no secrets in shared color helper state or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md`.
- Update `_docs/_TASKS/TASK-283_Section_Widget_Playwright_Product_Followups.md`.
- Update `_docs/_TASKS/README.md`.

## Acceptance Criteria

- Shared color swatches no longer silently destroy CSS-variable or custom token text values.
- Hex/rgb picker flows remain usable for picker-compatible values.
- Shared tests prove the token-preservation contract instead of only fallback swatch display.
- Section planning/report docs route this drift to TASK-327 rather than closed TASK-256 tasks.
