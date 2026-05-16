# TASK-264-01: Divider Label Color Typography and Gap Controls

# FileName: TASK-264-01_Divider_Label_Color_Typography_and_Gap_Controls.md

**Priority:** High
**Category:** Widgets + Layout + Design Tokens + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-256-05-03, TASK-264
**Status:** To Do

---

## Overview

Add Divider-owned label controls requested by
`_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` for the `label-center` variant.

This leaf covers only label-specific product behavior:

- W1: separate label color from line color;
- W2: configurable label typography instead of hardcoded `text-xs font-medium
  uppercase tracking-wider`;
- W8: prevent long labels from wrapping across the separator line;
- W9: configurable gap between the label and line segments;
- U2: make editor copy truthful when the line and label colors can differ;
- U9: add a clear-label affordance.

## Scope Boundary

This leaf does not own the shared CSS-variable color picker fix from TASK-256.
Label color controls must use the final shared color-field behavior once it is
available. If that helper is not available when this leaf starts, implement only
the schema/render/test portion and leave the color picker UX blocked on
TASK-256-02 rather than creating a second local color picker contract.

## Sub-Tasks

- [ ] Define label style field names in `core/widgets/core/divider.tsx`.
- [ ] Extend `dividerSchema`, `dividerDefaults`, and `normalizeDividerData()`
  with backward-compatible label style defaults.
- [ ] Render `label-center` with a nowrap label, configurable label color,
  typography, and label gap.
- [ ] Keep line-only and dashed variants visually unchanged for existing
  payloads.
- [ ] Add Visual controls for beginner-safe label style fields and Advanced
  raw-token controls only where needed.
- [ ] Add a clear-label action that removes the label value without changing the
  selected variant.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/divider.tsx` | Add bounded label style fields such as `labelColor`, `labelSize`, `labelWeight`, `labelTransform`, `labelLetterSpacing`, and `labelGap` or equivalent repo-native names. Update schema, defaults, normalizer, and render styles/classes. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Add label style controls under the label-center path, truthful labels for line vs label color, and clear-label affordance. |
| `tests/vitest/widgets/divider.test.tsx` | Add normalization and SSR output assertions for label style defaults, configured label color/typography/gap, and nowrap behavior. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | Add editor interaction assertions for label color/text controls, gap token selection, and clear-label behavior. |
| `_docs/_WIDGETS/DIVIDER.md` | Document label style fields and backward compatibility. |

## Implementation Pseudocode

```ts
const dividerLabelSizeTokens = ["xs", "sm", "base"] as const;
const dividerLabelWeightTokens = ["medium", "semibold", "bold"] as const;
const dividerLabelTransformTokens = ["none", "uppercase"] as const;
const dividerLabelGapTokens = ["2", "3", "4", "6"] as const;

function normalizeDividerLabelStyle(data: DividerData) {
  return {
    labelColor: normalizeColorToken(data.labelColor, data.color ?? dividerDefaults.color),
    labelSize: resolveToken(data.labelSize, "xs", dividerLabelSizeTokens),
    labelWeight: resolveToken(data.labelWeight, "medium", dividerLabelWeightTokens),
    labelTransform: resolveToken(data.labelTransform, "uppercase", dividerLabelTransformTokens),
    labelGap: resolveToken(data.labelGap, "3", dividerLabelGapTokens),
  };
}
```

Render flow:

```tsx
function renderLabelCenterDivider(normalized: DividerData) {
  const labelStyle = normalizeDividerLabelStyle(normalized);
  return (
    <div className={labelGapClassMap[labelStyle.labelGap]}>
      <span aria-hidden="true" className="block flex-1 border-t" />
      <span className="shrink-0 whitespace-nowrap px-1" style={{ color: labelStyle.labelColor }}>
        {normalized.label?.trim()}
      </span>
      <span aria-hidden="true" className="block flex-1 border-t" />
    </div>
  );
}
```

Error handling:

- Unknown label style tokens normalize to defaults without dropping the label.
- Empty label color falls back to the existing line color until the user
  configures a separate label color.
- Clear-label removes `label` only; it must not switch variants or delete style
  fields.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must list every new label field.
- Anti-abuse: label style fields are bounded tokens or safe color strings only;
  label text remains plain React text, never raw HTML.
- Secret handling: no secrets in label data, DOM markers, diagnostics, or
  reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
  if approved `none` tokens are introduced
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/DIVIDER.md`.
- Update `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` rows W1, W2, W8, W9, U2,
  and U9 after validation.
- Update `_docs/WIDGETS.md` only if this leaf changes a shared widget contract.

## Changelog Policy

- Covered by the TASK-264 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- `label-center` can use a label color distinct from the line color.
- Label typography and label gap are schema-backed, normalized, rendered, and
  tested.
- Long labels do not wrap into a broken line/label/line layout.
- The editor exposes a clear-label action without changing the Divider variant.
