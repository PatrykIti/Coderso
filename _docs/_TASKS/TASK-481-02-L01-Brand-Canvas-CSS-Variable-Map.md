# TASK-481-02-L01: `toPageCanvasBrandColorCssVariableMap` + Contract Tests

# FileName: TASK-481-02-L01-Brand-Canvas-CSS-Variable-Map.md

**Parent Subtask:** TASK-481-02
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas / Design Tokens
**Estimated Effort:** Small
**Dependencies:** TASK-481-01-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`
**Changelog:** 1317 (pinned; create only at TASK-481 closure)

---

## Overview

**Goal:** Add a pure owner helper `toPageCanvasBrandColorCssVariableMap(tokens)` in
`core/ui/theme/tokenCss.ts` that returns the four SITE brand CSS vars
(`--color-primary`, `--color-secondary`, `--color-accent`, `--color-border`) from a
resolved `DesignTokens`, so TASK-481-02-L02 can paint them on the
`data-page-editor-content` scope. It is the brand counterpart to the existing
`toPageCanvasColorCssVariableMap` (which emits typography + the three neutrals and
deliberately OMITS brand — see its doc comment at tokenCss.ts ~114–127, function at
:128).

**Owning module(s) to create-or-extend:**
- `core/ui/theme/tokenCss.ts` (single owner of canvas CSS-var maps).

**Source-of-truth docs:**
- `_docs/DESIGN_TOKENS.md` (Pages v2 color-token authoring: the seven
  `var(--color-*)`; the front emits all on `:root` via `toCssVariables`).
- `_docs/THEMES_SPEC.md` (token merge order: theme defaults → `design.tokens` →
  profile overrides).

**Out-of-scope:** Wiring the map into the canvas (TASK-481-02-L02); the admin
re-assertion (TASK-481-01-L02); any neutral/typography change.

## Security Contract

Not a route/auth/data leaf — N/A: pure TS mapping function, no endpoint/auth/RBAC/
CSRF/rate-limit, no validation-owner change, no secrets/PII. The values come from the
already-resolved, already-sanitized `DesignTokens` (settings `design.tokens` flow
through the existing redaction + token merge; this helper neither widens nor relaxes
that).

## Implementation Pseudocode

```ts
// core/ui/theme/tokenCss.ts  (place next to toPageCanvasColorCssVariableMap)
/**
 * The four SITE BRAND page-color vars for the Page V2 editor canvas CONTENT scope
 * (`data-page-editor-content`). Counterpart to {@link toPageCanvasColorCssVariableMap},
 * which emits typography + neutrals on the canvas FRAME and intentionally omits
 * brand (brand on the frame would recolor editor chrome). These four are safe ONLY
 * inside the content scope, where chrome re-asserts the admin brand
 * (`adminBrandColorCssVariableMap`). Mirrors the brand half of {@link toCssVariableMap}.
 */
export function toPageCanvasBrandColorCssVariableMap(
  tokens: DesignTokens
): Record<string, string> {
  return {
    "--color-primary": tokens.colors.primary,
    "--color-secondary": tokens.colors.secondary,
    "--color-accent": tokens.colors.accent,
    "--color-border": tokens.neutrals.border,
  };
}
```

Notes for the implementer:
- `--color-border` is sourced from `tokens.neutrals.border` (NOT a `colors.*` field) —
  match `toCssVariableMap`:171 exactly; `border` is the brand-eligible neutral in the
  authoring allowlist (`authoringColorTokenNames` includes `border`) and is filtered
  into the inline brand set, so it belongs in this brand map.
- Return value order/keys must be exactly these four; no neutrals (`bg`/`surface`/
  `text` stay on the frame map), no typography.
- **Error handling:** none — total function over a fully-resolved `DesignTokens`.

**Regression-test shape:** call with `DEFAULT_TOKENS` and with a custom-token fixture;
assert exact 4 keys and values equal `tokens.colors.{primary,secondary,accent}` +
`tokens.neutrals.border`; assert parity with the corresponding entries of
`toCssVariableMap(tokens)`; assert it shares NO keys with
`toPageCanvasColorCssVariableMap(tokens)` (disjoint frame/content maps).

## Testing Requirements

- Vitest lane only: `tests/vitest/ui/themeTokens.test.ts` (extend; pure-TS contract,
  no runtime/route/DB dependency).
- Cases: exact key set; value sourcing; parity with `toCssVariableMap`; disjointness
  from the frame neutral/typography map.
- No DB migration artifacts.
