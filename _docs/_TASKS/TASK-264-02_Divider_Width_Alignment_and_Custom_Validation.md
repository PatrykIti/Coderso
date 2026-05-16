# TASK-264-02: Divider Width Alignment and Custom Validation

# FileName: TASK-264-02_Divider_Width_Alignment_and_Custom_Validation.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-264
**Status:** To Do

---

## Overview

Add Divider-owned width, alignment, and custom-width validation behavior from
`_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md`.

This leaf covers:

- W3: replace the hardcoded `container` width with a configurable bounded
  container-width token or value;
- W4: add horizontal alignment for `container` and `custom` width modes;
- U5/U6: show clear validation feedback for custom width values instead of
  silently falling back to defaults;
- custom-width portion of U7: make the resolved/fallback message truthful.

## Scope Boundary

This leaf does not change shared spacing-token semantics or the TASK-256 custom
spacing UX. It may show custom-width validation feedback because `customWidth`
is Divider-owned, but it must not introduce a new shared `SpacingField` state
machine.

## Sub-Tasks

- [ ] Define bounded width-alignment fields in `divider.tsx`.
- [ ] Extend `dividerSchema`, `dividerDefaults`, and `normalizeDividerData()`
  without changing existing `full`, `container`, or `custom` payload meanings.
- [ ] Replace `resolveDividerWidthCss("container")` hardcoding with a normalized
  `containerWidth` value or token.
- [ ] Add `left`, `center`, and `right` alignment mapping for non-full widths.
- [ ] Add custom-width validation helpers that can return both persisted
  normalized value and editor feedback.
- [ ] Update editor controls and tests for valid `%`, `px`, `rem`, `em`, and
  numeric width values plus invalid fallback copy.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/divider.tsx` | Add `align` and `containerWidth` or equivalent bounded fields; export pure validation helpers for width input feedback; update width CSS and alignment class/style mapping. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Add width alignment controls and custom-width validation text for Visual/Advanced. |
| `tests/vitest/widgets/divider.test.tsx` | Add normalization and SSR output assertions for container width, alignment, valid custom widths, and invalid fallback behavior. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | Add editor assertions for alignment selection and custom-width error/resolved copy. |
| `_docs/_WIDGETS/DIVIDER.md` | Document width modes, alignment, and custom-width validation. |

## Implementation Pseudocode

```ts
export type DividerAlignment = "left" | "center" | "right";

const dividerContainerWidthTokens = {
  sm: "min(100%, 40rem)",
  md: "min(100%, 48rem)",
  lg: "min(100%, 64rem)",
} as const;

function validateDividerWidthInput(value: string | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (trimmed.length === 0) {
    return { status: "empty", css: dividerDefaults.customWidth, message: "Using default width." };
  }
  if (cssLengthPattern.test(trimmed) || numberPattern.test(trimmed)) {
    return { status: "valid", css: normalizeCssLength(trimmed), message: "Resolved width." };
  }
  return { status: "invalid", css: dividerDefaults.customWidth, message: "Invalid width; using default." };
}

function resolveDividerAlignmentClass(widthMode: DividerWidthMode, align: DividerAlignment) {
  if (widthMode === "full") return "mx-0";
  if (align === "left") return "mr-auto";
  if (align === "right") return "ml-auto";
  return "mx-auto";
}
```

Error handling:

- Invalid persisted custom widths continue to normalize to the safe default.
- The editor must show the fallback reason before persistence so the user is not
  surprised by a normalized value.
- Existing payloads without `align` or `containerWidth` render exactly as the
  current centered `48rem` container until the user configures new fields.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must list new width/alignment fields.
- Anti-abuse: width values remain bounded CSS length inputs only; no arbitrary
  class names or raw style maps.
- Secret handling: no secrets in widget data, diagnostics, reports, or DOM
  markers.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/DIVIDER.md`.
- Update `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` rows W3, W4, U5, U6, and
  the custom-width part of U7 after validation.

## Changelog Policy

- Covered by the TASK-264 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Container width is configurable through a bounded schema-backed field.
- Custom/container dividers can align left, center, or right.
- Invalid custom widths show clear editor feedback and still normalize safely.
- Existing Divider payloads remain backward compatible.
