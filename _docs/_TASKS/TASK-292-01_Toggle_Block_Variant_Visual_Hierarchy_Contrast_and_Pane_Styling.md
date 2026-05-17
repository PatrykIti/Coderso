# TASK-292-01: Toggle Block Variant Visual Hierarchy, Contrast, and Pane Styling

# FileName: TASK-292-01_Toggle_Block_Variant_Visual_Hierarchy_Contrast_and_Pane_Styling.md

**Priority:** High
**Category:** Widgets + Layout + Runtime Render + Admin UI + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-292, TASK-256-02, TASK-256-05-04
**Status:** To Do

---

## Overview

Make the Toggle Block `cards` variant visually distinct, add safe active-trigger
contrast control, and add bounded pane styling that stays specific to the
two-pane Toggle Block product surface.

This leaf owns product-level visual fields. It does not own the shared Clear,
`none`, CSS-variable picker, or duplicate-ID/ARIA contracts from TASK-256.

## Source Evidence

- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:58-60` reports the hardcoded
  `--nextless-toggle-accent-contrast`.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:76-81` reports the weak visual
  distinction between `switch` and `cards`.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:82-85` reports no per-pane
  styling controls.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:236-237` marks active
  contrast and weak `switch`/`cards` visual distinction as high-priority Toggle
  Block rows.

## Scope

- Add a bounded `style.accentContrastColor` field or a deterministic contrast
  resolver that keeps active trigger text readable.
- Make `cards` visibly card-like through pane surface, trigger layout, spacing,
  and framing changes that do not alter slot ownership.
- Add optional pane-level style controls only for bounded values such as surface
  token, padding token, radius token, and border emphasis.
- Preserve existing `style.surfaceColor`, `style.borderColor`, and
  `style.accentColor` semantics from TASK-256.
- Keep arbitrary CSS strings out of new pane-specific fields unless an existing
  shared token control safely owns them.

## Out of Scope

- Generic Clear controls or `none` token semantics; TASK-256-02 owns them.
- Instance-safe IDs, ARIA relationships, or runtime script binding; TASK-256-04
  and TASK-256-05-04 own them.
- A one-off color picker. Consume the final TASK-256 shared color/token control
  if it exists; otherwise keep the field contract text-based and documented.
- Three or more Toggle Block states.

## Sub-Tasks

- [ ] Decide whether active-trigger contrast is a persisted
  `accentContrastColor` field or a deterministic resolver, then document the
  compatibility path.
- [ ] Extend Toggle Block schema/defaults/normalizer with bounded style fields.
- [ ] Render the final `cards` visual hierarchy and pane style classes from
  normalized enum/token values.
- [ ] Add editor controls that consume shared TASK-256 color/clear helpers when
  they are available.
- [ ] Add focused runtime, editor, and validator tests.
- [ ] Update Toggle Block widget docs and Playwright report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/toggleBlock.tsx` | Extend schema/defaults/normalizer with bounded style fields, render active contrast, and make `cards` structurally distinct. |
| `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | Add editor controls for Toggle Block-only style fields, using shared TASK-256 controls when available. |
| `tests/vitest/widgets/toggleBlock.test.tsx` | Cover normalizer defaults, SSR style output, `cards` visual class differences, and contrast output. |
| `tests/vitest/ui/toggle-block-editor-wave.test.tsx` | Cover editor controls, normalization, diagnostics, and shared clear/color control adoption where applicable. |
| `tests/unit/widgets/validator.test.ts` | Add schema acceptance/rejection coverage if persisted fields are added. |
| `_docs/_WIDGETS/TOGGLE_BLOCK.md` | Document new visual fields and `cards` behavior. |
| `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` | Mark relevant rows fixed/deferred after implementation. |

## Implementation Pseudocode

```ts
type ToggleBlockPaneStyleToken = "default" | "soft" | "contrast";
type ToggleBlockPanePaddingToken = "compact" | "comfortable" | "spacious";

const toggleBlockStyleDefaults = {
  accentContrastColor: "var(--color-background)",
  paneSurface: "default",
  panePadding: "comfortable",
  paneRadius: "md",
} satisfies NonNullable<ToggleBlockData["style"]>;

function normalizeToggleBlockStyle(style: unknown): ToggleBlockData["style"] {
  const current = isRecord(style) ? style : {};
  return {
    surfaceColor: resolveClearableStyleValue(current.surfaceColor),
    borderColor: normalizeSharedStyleField(current.borderColor, "var(--color-border)"),
    accentColor: normalizeSharedStyleField(current.accentColor, "var(--color-text)"),
    accentContrastColor: normalizeSharedStyleField(
      current.accentContrastColor,
      "var(--color-background)"
    ),
    paneSurface: resolveEnum(current.paneSurface, paneSurfaceOptions, "default"),
    panePadding: resolveEnum(current.panePadding, panePaddingOptions, "comfortable"),
    paneRadius: resolveEnum(current.paneRadius, paneRadiusOptions, "md"),
  };
}

function resolvePaneClass(variant: ToggleBlockVariantId, style: NormalizedToggleBlockStyle) {
  return joinClasses(
    "border",
    variant === "cards" && "shadow-sm",
    paneSurfaceClass[style.paneSurface],
    panePaddingClass[style.panePadding],
    paneRadiusClass[style.paneRadius]
  );
}
```

Data flow:

1. Normalize every new style field in `normalizeToggleBlockData`.
2. Render CSS variables/classes from normalized values only.
3. Keep editor controls bound to the normalized data and write back through the
   existing `updateStyle` helper.
4. If the shared TASK-256 color/token picker exists, wrap it instead of adding a
   local picker.

Error handling:

- Unknown enum values fall back to defaults.
- Empty color fields use the shared style resolver behavior.
- Invalid pane style tokens are never rendered as raw classes.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model, RBAC, CSRF, and rate limits: unchanged.
- Reject-unknown validation: update `toggleBlockSchema` and validator tests for
  every new field.
- Anti-abuse: no raw class names, user-authored scripts, unsafe inline handlers,
  or unbounded CSS injection in pane style tokens.
- Secret handling: no secrets or privileged values in widget JSON or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TOGGLE_BLOCK.md` with the final style fields, allowed
  values, and `cards` variant visual contract.
- Update `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` with fixed/deferred
  evidence for contrast, cards distinction, and pane styling rows.

## Acceptance Criteria

- `cards` is visibly distinct from `switch` in runtime and editor preview.
- Active trigger contrast is configurable or safely resolved.
- Pane styling is bounded, schema-backed, normalized, and covered by tests.
- No TASK-256 shared clear/ARIA/placeholder contract is duplicated.
