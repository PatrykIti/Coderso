# TASK-264-03: Divider Line Style Opacity and Spacer Only Mode

# FileName: TASK-264-03_Divider_Line_Style_Opacity_and_Spacer_Only_Mode.md

**Priority:** Medium
**Category:** Widgets + Layout + Design Tokens + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-256-05-03, TASK-264
**Status:** To Do

---

## Overview

Add Divider-owned line style, opacity, and visibility options from
`_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md`.

This leaf covers:

- W5: alpha/opacity control for line and label styling without replacing the
  shared CSS-variable picker contract;
- W10: dotted/dashed line-style polish beyond the current browser-default
  dashed variant;
- W11: a spacer-only mode for intentional vertical rhythm without a visible
  line.

## Scope Boundary

This leaf must not implement a global color picker or global opacity control.
Use bounded Divider fields such as opacity tokens and line-style variants. If a
shared alpha-aware color input is required, split it back to TASK-256 before
continuing.

The spacer-only mode is Divider-specific product behavior. It must not change
the separate Spacer widget or shared slot/spacing contracts.

## Sub-Tasks

- [ ] Define line visibility/style/opacity fields in `divider.tsx`.
- [ ] Extend schema/defaults/normalizer with safe defaults that preserve current
  `line`, `dashed`, and `label-center` output.
- [ ] Add runtime rendering for `solid`, `dashed`, `dotted`, and optional
  spacer-only visibility without leaking editor-only placeholders.
- [ ] Add editor controls for opacity and line style in Visual/Advanced.
- [ ] Decide whether spacer-only is a new variant or a schema-backed visibility
  field, and document the chosen model before implementation.
- [ ] Add tests for opacity style output, dotted line output, and spacer-only
  output.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/divider.tsx` | Add line style, opacity, and visibility/spacer-only fields; update schema/defaults/normalizer and runtime output. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Add bounded controls for line style, opacity, and spacer-only visibility. |
| `tests/vitest/widgets/divider.test.tsx` | Add SSR assertions for opacity, dotted/dashed/solid output, spacer-only output, and backward compatibility. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | Add editor interaction assertions for the new style/visibility controls. |
| `_docs/_WIDGETS/DIVIDER.md` | Document line style, opacity, and spacer-only behavior. |

## Implementation Pseudocode

```ts
export type DividerLineStyle = "solid" | "dashed" | "dotted";
export type DividerVisibility = "line" | "spacer-only";
export type DividerOpacityToken = "100" | "75" | "50" | "25";

function normalizeDividerLineStyle(data: DividerData, variant: DividerVariantId) {
  return {
    lineStyle:
      data.lineStyle === "dotted" || data.lineStyle === "dashed"
        ? data.lineStyle
        : variant === "dashed"
          ? "dashed"
          : "solid",
    visibility: data.visibility === "spacer-only" ? "spacer-only" : "line",
    opacity: resolveToken(data.opacity, "100", dividerOpacityTokens),
  };
}

function buildDividerLineStyle(input: NormalizedDividerLineStyle) {
  if (input.visibility === "spacer-only") return { borderTopWidth: 0 };
  return {
    borderTopStyle: input.lineStyle,
    opacity: Number(input.opacity) / 100,
  };
}
```

Error handling:

- Unknown opacity/style/visibility values normalize to current default line
  output.
- Spacer-only still renders the configured top/bottom margins and deterministic
  markers, but no visible border.
- Label-center with spacer-only should either hide the label or block the
  combination with clear editor copy; choose and test one deterministic rule.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must list every new style/visibility field.
- Anti-abuse: style values are bounded tokens/enums only; no raw CSS maps,
  arbitrary class names, HTML, or scripts.
- Secret handling: no secrets in widget data, DOM markers, diagnostics, or
  reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
  if this leaf uses `none` as an approved visual token
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/DIVIDER.md`.
- Update `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` rows W5, W10, and W11
  after validation.
- Update `_docs/WIDGETS.md` only if this leaf creates a shared opacity/token
  rule.

## Changelog Policy

- Covered by the TASK-264 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Divider supports bounded opacity and line-style controls without raw CSS.
- Spacer-only behavior is deterministic, documented, and tested.
- Current saved Divider payloads render as before unless the new fields are
  configured.
