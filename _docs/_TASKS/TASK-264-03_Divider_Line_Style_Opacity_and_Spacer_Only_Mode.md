# TASK-264-03: Divider Line Style Opacity and Spacer Only Mode

# FileName: TASK-264-03_Divider_Line_Style_Opacity_and_Spacer_Only_Mode.md

**Priority:** Medium
**Category:** Widgets + Layout + Design Tokens + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-256-05-03, TASK-264
**Status:** Done (2026-05-17)

---

## Overview

Add Divider-owned line style, opacity, and visibility options from
`_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md`.

This leaf covers:

- W5: an editor-visible transparency authoring path for line and label styling
  without requiring raw CSS-only workarounds or a global alpha-picker rewrite;
- W10: bounded dash-pattern and dotted line-style polish beyond the current
  browser-default dashed variant;
- W11: schema-backed `visibility: "spacer-only"` mode for intentional vertical
  rhythm without a visible line.

## Scope Boundary

This leaf must not implement a global color picker or global opacity control.
Use a Divider-local transparency authoring path such as bounded opacity tokens
paired with the existing color fields, or another explicit editor affordance
that lets authors set transparency without dropping to undocumented raw values.
If a shared alpha-aware color input is required, split it back to TASK-256
before continuing.

The spacer-only mode is Divider-specific product behavior. It must not change
the separate Spacer widget or shared slot/spacing contracts.

## Sub-Tasks

- [x] Define line visibility/style/opacity/dash-pattern fields in
  `divider.tsx`.
- [x] Extend schema/defaults/normalizer with safe defaults that preserve current
  `line`, `dashed`, and `label-center` output.
- [x] Add runtime rendering for `solid`, `dashed`, `dotted`, bounded
  dash-pattern tokens, and optional spacer-only visibility without leaking
  editor-only placeholders.
- [x] Add editor controls for transparency, line style, and dash pattern in
  Visual/Advanced.
- [x] Model spacer-only as a schema-backed `visibility` field, not a new
  variant, so existing `line`, `dashed`, and `label-center` variant ownership
  remains stable.
- [x] Add tests for opacity style output, dotted line output, dash-pattern
  output, and spacer-only output.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/divider.tsx` | Add line style, opacity, dash-pattern, and schema-backed `visibility` fields; update schema/defaults/normalizer and runtime output. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Add bounded controls for line style, dash pattern, opacity, and spacer-only visibility. |
| `tests/vitest/widgets/divider.test.tsx` | Add SSR assertions for opacity, dotted/dashed/solid output, dash-pattern output, spacer-only output, and backward compatibility. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | Add editor interaction assertions for the new style/visibility controls. |
| `_docs/_WIDGETS/DIVIDER.md` | Document line style, opacity, and spacer-only behavior. |

## Implementation Pseudocode

```ts
export type DividerLineStyle = "solid" | "dashed" | "dotted";
export type DividerVisibility = "line" | "spacer-only";
export type DividerOpacityToken = "100" | "75" | "50" | "25";
export type DividerDashPattern = "browser" | "short" | "wide";

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
    dashPattern: resolveToken(data.dashPattern, "browser", dividerDashPatternTokens),
  };
}

const dividerDashPatternStyleMap = {
  browser: undefined,
  short: "6 4",
  wide: "12 8",
} as const;

function buildDividerLineStyle(input: NormalizedDividerLineStyle) {
  if (input.visibility === "spacer-only") return { borderTopWidth: 0 };
  const borderImage =
    input.lineStyle === "dashed"
      ? buildRepeatingLinearGradientBorder(input.dashPattern)
      : undefined;
  return {
    borderTopStyle: input.lineStyle,
    borderImage,
    opacity: Number(input.opacity) / 100,
  };
}
```

Error handling:

- Unknown opacity/style/dash-pattern/visibility values normalize to current
  default line output.
- The task must not close while transparency still requires a hidden
  text-input-only workaround; W5 needs a truthful authoring path in the editor.
- Spacer-only still renders the configured top/bottom margins and deterministic
  markers, but no visible border.
- Label-center with spacer-only should either hide the label or block the
  combination with clear editor copy; choose and test one deterministic rule.
- Do not add a `spacer-only` variant id; variant selection remains owned by the
  current Divider variants and spacer-only is persisted only through
  `data.visibility`.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must list every new style/visibility field.
- Anti-abuse: style values are bounded tokens/enums only; no raw CSS maps,
  arbitrary class names, HTML, or scripts.
- Secret handling: no secrets in widget data, DOM markers, diagnostics, or
  reports.

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
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
  if this leaf uses `none` as an approved visual token
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit` before any manual commit or leaf closure

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

- Divider supports bounded transparency, line-style, and dash-pattern controls
  without raw CSS.
- Authors can set Divider transparency through the editor without relying on
  undocumented raw CSS-only input.
- Spacer-only behavior is deterministic, documented, and tested.
- Current saved Divider payloads render as before unless the new fields are
  configured.
