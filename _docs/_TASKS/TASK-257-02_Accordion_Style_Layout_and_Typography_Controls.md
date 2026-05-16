# TASK-257-02: Accordion Style Layout and Typography Controls

# FileName: TASK-257-02_Accordion_Style_Layout_and_Typography_Controls.md

**Priority:** High
**Category:** Widgets + Layout + Design Tokens + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-257-01, TASK-257
**Status:** To Do

---

## Overview

Add Accordion-owned style, layout, and typography controls requested by
`REPORT_ACCORDION_WIDGET.md` after shared clear/none semantics from TASK-256 are
available.

This leaf covers product fields that are specific to the layout `accordion`
widget:

- W3: body/description text color;
- W5: panel content padding;
- W6: panel border radius;
- W7: accordion max width;
- W12: summary title font size/weight;
- U8: color picker UX parity for Accordion color fields.

## Scope Boundary

This leaf does not add shared token semantics. New fields must use the existing
repo token conventions and only introduce `none` where `_docs/WIDGETS.md`
permits it. Missing `Clear` buttons for existing color fields remain TASK-256-02
unless already landed before this leaf starts.

## Sub-Tasks

- [ ] Define Accordion style/layout field names and token sets in
  `accordion.tsx` before touching the editor.
- [ ] Extend `accordionSchema`, `accordionDefaults`, and
  `normalizeAccordionData()` with backward-compatible defaults.
- [ ] Render the new fields without replacing current variant defaults for
  existing saved payloads.
- [ ] Add color picker + text input pairs for Accordion color fields, matching
  the FAQ editor pattern without copying FAQ data ownership.
- [ ] Add Visual controls for beginner-safe fields and Advanced raw-token
  overrides only where needed.
- [ ] Keep field labels short enough for the right inspector and avoid
  multi-column input groups that truncate labels.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/accordion.tsx` | Add schema/defaults/normalizer maps for `descriptionTextColor`, `contentPadding`, `radius`, `maxWidth`, `summaryFontSize`, and `summaryFontWeight` or equivalent repo-native names. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Add token/color controls and color-picker UX. |
| `tests/vitest/widgets/accordionWidget.test.tsx` | Add render and normalization assertions for each new style/layout field. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Add editor interaction assertions for color picker/text sync and token selects. |
| `_docs/_WIDGETS/ACCORDION.md` | Document new fields and backward compatibility. |

## Implementation Pseudocode

```ts
const accordionPaddingClassMap = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

const accordionRadiusClassMap = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
} as const;

function normalizeAccordionStyle(style: AccordionData["style"] | undefined) {
  return {
    surfaceColor: resolveClearableStyleValue(style?.surfaceColor),
    borderColor: normalizeOptionalColor(style?.borderColor, accordionDefaults.style.borderColor),
    summaryTextColor: normalizeOptionalColor(style?.summaryTextColor, defaults.summaryTextColor),
    descriptionTextColor: normalizeOptionalColor(style?.descriptionTextColor, undefined),
    contentPadding: resolveToken(style?.contentPadding, "md", accordionPaddingTokens),
    radius: resolveToken(style?.radius, "lg", accordionRadiusTokens),
    maxWidth: resolveToken(style?.maxWidth, "full", accordionMaxWidthTokens),
    summaryFontSize: resolveToken(style?.summaryFontSize, "base", summarySizeTokens),
    summaryFontWeight: resolveToken(style?.summaryFontWeight, "semibold", summaryWeightTokens),
  };
}
```

Editor flow:

```tsx
function ColorField({ label, value, fallback, onChange, onClear }: ColorFieldProps) {
  return (
    <ClearableFieldHeader label={label} value={value} onClear={onClear} />
    // Pair native color input for hex values with text input for CSS variables.
  );
}
```

Error handling:

- Unknown tokens normalize to defaults without dropping other style fields.
- CSS variables remain valid in text inputs even when the native color picker
  must use a hex fallback.
- Cleared color fields omit inline styles instead of serializing empty strings.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must list every new style/layout field and
  reject unknown keys.
- Anti-abuse: style fields are token/color strings only; no HTML, scripts, or
  event handler data.
- Secret handling: no secrets in style data or Playwright evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  approved `none` tokens are added
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/ACCORDION.md`.
- Update `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` rows W3, W5, W6, W7,
  W12, and U8 after validation.
- Update `_docs/WIDGETS.md` only if this leaf adds a new shared token rule.

## Changelog Policy

- Covered by the TASK-257 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Accordion exposes documented, schema-backed controls for body text color,
  panel padding, radius, max width, and summary typography.
- Existing payloads render as before unless the user configures the new fields.
- Accordion color controls match the repo's color-picker/text-input pattern and
  preserve CSS variable values.
