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
- W5: summary trigger padding and panel content padding;
- W6: panel border radius;
- Accordion part of W7: accordion max width;
- Accordion part of W12: summary title font size/weight;
- U8: color picker UX parity for Accordion color fields.

## Scope Boundary

This leaf does not add shared token semantics. New fields must use the existing
repo token conventions and only introduce `none` where `_docs/WIDGETS.md`
permits it. Missing `Clear` buttons for existing color fields remain TASK-256-02
unless already landed before this leaf starts.

Exact Accordion schema paths for this leaf:

- `style.descriptionTextColor`
- `style.summaryPadding`
- `style.contentPadding`
- `style.radius`
- `style.summaryFontSize`
- `style.summaryFontWeight`
- `layout.maxWidth`

Do not add a `none` token for these new Accordion fields unless the same leaf
also updates `_docs/WIDGETS.md` to explicitly approve that shared token
extension. The default implementation should use concrete Accordion-local
tokens and preserve current variant defaults for legacy payloads.

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
| `core/widgets/core/accordion.tsx` | Add schema/defaults/normalizer maps for `style.descriptionTextColor`, `style.summaryPadding`, `style.contentPadding`, `style.radius`, `style.summaryFontSize`, `style.summaryFontWeight`, and `layout.maxWidth`. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Add token/color controls and color-picker UX. |
| `tests/vitest/widgets/accordionWidget.test.tsx` | Add render and normalization assertions for each new style/layout field. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Add editor interaction assertions for color picker/text sync and token selects. |
| `_docs/_WIDGETS/ACCORDION.md` | Document new fields and backward compatibility. |

## Implementation Pseudocode

```ts
const accordionPaddingClassMap = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

const accordionSummaryPaddingClassMap = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-5 py-4",
} as const;

const accordionRadiusClassMap = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
} as const;

const accordionMaxWidthClassMap = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  full: "max-w-none",
} as const;

function resolveAccordionToken<T extends string>(
  value: unknown,
  fallback: T,
  allowed: readonly T[]
) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeAccordionStyle(style: AccordionData["style"] | undefined) {
  return {
    surfaceColor: resolveClearableStyleValue(style?.surfaceColor),
    borderColor: normalizeAccordionColor(
      style?.borderColor,
      accordionDefaults.style?.borderColor
    ),
    summaryTextColor: normalizeAccordionColor(
      style?.summaryTextColor,
      accordionDefaults.style?.summaryTextColor
    ),
    descriptionTextColor: normalizeAccordionColor(style?.descriptionTextColor, undefined),
    summaryPadding: resolveAccordionToken(style?.summaryPadding, "md", accordionSummaryPaddingTokens),
    contentPadding: resolveAccordionToken(style?.contentPadding, "md", accordionPaddingTokens),
    radius: resolveAccordionToken(style?.radius, "lg", accordionRadiusTokens),
    summaryFontSize: resolveAccordionToken(style?.summaryFontSize, "base", summarySizeTokens),
    summaryFontWeight: resolveAccordionToken(
      style?.summaryFontWeight,
      "semibold",
      summaryWeightTokens
    ),
  };
}

function normalizeAccordionLayout(layout: AccordionData["layout"] | undefined) {
  return {
    maxWidth: resolveAccordionToken(layout?.maxWidth, "full", accordionMaxWidthTokens),
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

- Unknown tokens normalize to defaults without dropping other style/layout fields.
- CSS variables remain valid in text inputs even when the native color picker
  must use a hex fallback.
- Cleared color fields omit inline styles instead of serializing empty strings.
- Unknown `layout.maxWidth` values normalize to `full`.
- Summary trigger padding and panel content padding are separate because current
  runtime has hard-coded trigger padding and hard-coded body padding in different
  render locations.

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
- `bun test tests/unit/widgets/validator.test.ts`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/ACCORDION.md`.
- Update `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` rows W3, W5, W6,
  Accordion part of W7, Accordion part of W12, and U8 after validation.
- Update `_docs/WIDGETS.md` if this leaf adds a new shared token rule, including
  any new `none` token approval for Accordion fields.

## Changelog Policy

- Covered by the TASK-257 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Accordion exposes documented, schema-backed controls for body text color,
  summary trigger padding, panel content padding, radius, max width, and summary
  typography.
- Existing payloads render as before unless the user configures the new fields.
- Accordion color controls match the repo's color-picker/text-input pattern and
  preserve CSS variable values.
