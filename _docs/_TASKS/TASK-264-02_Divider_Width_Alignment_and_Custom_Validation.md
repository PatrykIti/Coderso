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
- U5 and the custom-width portion of U6: show clear validation feedback for
  custom width values instead of silently falling back to defaults.

## Scope Boundary

This leaf does not change shared spacing-token semantics, shared spacing
resolved-value copy, or the TASK-256 custom spacing UX. It may show custom-width
validation feedback because `customWidth` is Divider-owned, but it must not
introduce a new shared `SpacingField` state machine.

## Sub-Tasks

- [ ] Define bounded width-alignment fields in `divider.tsx`.
- [ ] Extend `dividerSchema`, `dividerDefaults`, and `normalizeDividerData()`
  without changing existing `full`, `container`, or `custom` payload meanings.
- [ ] Replace `resolveDividerWidthCss("container")` hardcoding with a normalized
  `containerWidth` value or token.
- [ ] Add `left`, `center`, and `right` alignment mapping for non-full widths.
- [ ] Add custom-width validation helpers that can return both persisted
  normalized value and editor feedback.
- [ ] Refactor the current `DividerEditors.tsx` update path so invalid raw
  custom-width input remains visible while the persisted payload still
  normalizes safely. The current editor calls `normalizeValue()` before
  `onChange`, so this leaf must add local raw draft state or a
  non-normalizing field update path for the custom-width input.
- [ ] Update editor controls and tests for valid `%`, `px`, `rem`, `em`, and
  numeric width values plus invalid raw input that remains visible with
  fallback copy.

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

Editor flow:

```tsx
function CustomWidthField({ normalizedValue, onCommit }: CustomWidthFieldProps) {
  const [draft, setDraft] = useState(normalizedValue.customWidth ?? dividerDefaults.customWidth);
  const validation = validateDividerWidthInput(draft);

  return (
    <>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onCommit(validation.css)}
      />
      <p role={validation.status === "invalid" ? "alert" : undefined}>
        {validation.message}
      </p>
    </>
  );
}
```

Error handling:

- Invalid persisted custom widths continue to normalize to the safe default.
- The editor must show the fallback reason before persistence so the user is not
  surprised by a normalized value.
- Invalid raw custom-width text must remain visible in the input until the user
  corrects it or commits a valid value; do not immediately replace it through
  the current normalized `updateData()` path.
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

## Git Scope Safeguards

- Work in a dedicated TASK-264 branch or worktree when implementation runs
  alongside other widget-report agents.
- Re-read `_docs/_TASKS/README.md` immediately before editing the board because
  it is a shared hotspot.
- Stage only this leaf's Divider owner files plus required Divider docs, report,
  changelog, and task-board updates.
- Verify `git diff --cached --name-only` before every commit so unrelated
  widget task families stay out of scope.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit` before any manual commit or leaf closure

## Documentation Updates Required

- Update `_docs/_WIDGETS/DIVIDER.md`.
- Update `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` rows W3, W4, U5, and the
  custom-width portion of U6 after validation.

## Changelog Policy

- Covered by the TASK-264 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Container width is configurable through a bounded schema-backed field.
- Custom/container dividers can align left, center, or right.
- Invalid custom widths show clear editor feedback and still normalize safely.
- Invalid custom-width drafts remain visible long enough for the user to fix
  them instead of being overwritten by `normalizeDividerData()`.
- Existing Divider payloads remain backward compatible.
