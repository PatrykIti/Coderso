# TASK-284-02: Spacer Viewport and Fluid Length Units

# FileName: TASK-284-02_Spacer_Viewport_and_Fluid_Length_Units.md

**Priority:** Medium
**Category:** Widgets + Layout + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-256-05-03, TASK-284
**Status:** To Do

---

## Overview

Add bounded viewport and fluid length support for Spacer height values from
`_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`.

This leaf covers:

- BF-02: viewport units such as `vh`, `dvh`, `svh`, and `vw`;
- BF-03: safe `clamp()` fluid spacing.

The goal is not arbitrary CSS passthrough. The implementation must define a
small, testable grammar for allowed length values and keep existing token and
pixel payloads backward compatible.

## Scope Boundary

In scope:

- safe length parser/normalizer updates in the Spacer contract;
- editor help or controls that expose viewport/fluid values without raw CSS
  surprises;
- deterministic CSS custom-property output for public runtime;
- validator and runtime tests for accepted/rejected values.

Out of scope:

- shared `none`/clear/custom-token UI repair from TASK-256;
- generic CSS expression support for other widgets;
- arbitrary `calc()`, CSS variables, classes, style declarations, or theme token
  expressions unless a later shared contract explicitly supports them.

## Sub-Tasks

- [ ] Define the accepted Spacer custom length grammar.
- [ ] Extend `resolveHeightTokenOrPx()` or an equivalent exported helper so it
  accepts existing tokens, bare numbers, `px`, bounded viewport units, and a
  constrained `clamp(min, preferred, max)` form.
- [ ] Keep invalid values falling back to deterministic defaults without
  throwing in render paths.
- [ ] Update editor copy or controls so authors know which units are accepted.
- [ ] Add runtime and editor tests for accepted viewport/fluid values and
  rejected unsafe CSS strings.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/spacer.tsx` | Add safe viewport/fluid parsing and normalization while preserving existing token/px behavior and public data markers. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | Add unit help or bounded controls for viewport/fluid values after TASK-256 token UI is stable. |
| `tests/vitest/widgets/spacer.test.tsx` | Add normalization and SSR assertions for `10vh`, `50dvh`, `5svh`, `12vw`, safe `clamp()`, and rejected CSS payloads. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Add editor assertions for unit help and value entry. |
| `tests/unit/widgets/validator.test.ts` | Run or update if schema semantics change beyond string fields. |
| `_docs/_WIDGETS/SPACER.md` | Document the final length grammar and examples. |

## Implementation Pseudocode

```ts
const viewportLengthPattern = /^\d+(?:\.\d+)?(?:vh|dvh|svh|lvh|vw)$/i;
const clampLengthPattern =
  /^clamp\(\s*(\d+(?:\.\d+)?(?:px|rem|vh|dvh|svh|lvh|vw))\s*,\s*(\d+(?:\.\d+)?(?:px|rem|vh|dvh|svh|lvh|vw))\s*,\s*(\d+(?:\.\d+)?(?:px|rem|vh|dvh|svh|lvh|vw))\s*\)$/i;

function normalizeSpacerLength(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  if (isSpacerToken(trimmed)) return trimmed;
  if (numberPattern.test(trimmed)) return `${trimmed}px`;
  if (pxPattern.test(trimmed)) return trimmed.toLowerCase();
  if (viewportLengthPattern.test(trimmed)) return trimmed.toLowerCase();
  if (clampLengthPattern.test(trimmed)) return normalizeClampSpacing(trimmed);
  return fallback;
}
```

Data flow:

1. `normalizeSpacerData()` calls the safe length resolver for desktop, tablet,
   and mobile values.
2. `SpacerBlock` writes the normalized value to `data-spacer-*` markers and CSS
   custom properties.
3. `resolveSpacerCssHeight()` maps known tokens to rem values and returns already
   validated custom values unchanged.

Error handling:

- Reject `calc()`, `url()`, semicolons, CSS variables, negative lengths,
  unbounded units, and malformed `clamp()` by falling back to the relevant
  default.
- Do not throw during render for legacy malformed payloads.
- Preserve existing `none` and pixel behavior until TASK-256 changes the shared
  token contract.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema remains strict; if a more specific length
  schema is added, update validator tests.
- Anti-abuse: accepted length values must be grammar-limited and cannot contain
  raw CSS declarations, URLs, scripts, comments, semicolons, CSS variables, or
  unbounded class names.
- Secret handling: no secrets in Spacer data, DOM markers, diagnostics, or
  reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  markers or wrapper output change.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  token adjacency changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If this leaf is committed or moved to `Done` separately from TASK-284-05, also
  run root `bun run lint`, targeted Vitest/Bun lanes above,
  `bun run scan:security:strict`, and `bun run precommit`; otherwise keep this
  leaf open until TASK-284-05 runs the final family gate.

## Documentation Updates Required

- Update `_docs/_WIDGETS/SPACER.md` with accepted length units, examples, and
  rejected unsafe patterns.
- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` rows BF-02 and BF-03 after
  validation.
- Update `_docs/WIDGETS.md` only if the accepted length grammar becomes a shared
  widget contract.

## Changelog Policy

- Covered by the TASK-284 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Spacer accepts documented viewport units and safe fluid `clamp()` values.
- Existing token, bare number, and `px` payloads remain backward compatible.
- Unsafe CSS strings normalize to defaults and never reach runtime CSS custom
  properties.
- Editor copy accurately describes the accepted custom length grammar.
