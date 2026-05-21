# TASK-284-02: Spacer Viewport and Fluid Length Units

# FileName: TASK-284-02_Spacer_Viewport_and_Fluid_Length_Units.md

**Priority:** Medium
**Category:** Widgets + Layout + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-284, TASK-303, TASK-284-01
**Status:** Done (2026-05-21)

---

## Overview

Add bounded viewport and fluid length support for Spacer height values from
`_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`.

This leaf covers:

- BF-02: viewport units such as `vh`, `dvh`, `svh`, and `vw`;
- BF-03: safe `clamp()` fluid spacing.

The starting state for this leaf is the post-`TASK-303` explicit custom-edit
mode and the post-`TASK-284-01` helper/a11y copy. The goal is still not
arbitrary CSS passthrough. The implementation must define a small, testable
grammar for allowed length values and keep existing token and pixel payloads
backward compatible.

## Scope Boundary

In scope:

- safe length parser/normalizer updates in the Spacer contract;
- additive, opt-in editor helper changes so Spacer can reuse the shared
  `TokenOrPixelField` without changing Divider's default px-only behavior;
- editor help that exposes viewport/fluid values without raw CSS surprises;
- deterministic CSS custom-property output for public runtime;
- normalizer, runtime, and editor tests for accepted viewport/fluid values and
  unsafe-value fallback.

Out of scope:

- shared `none`/clear/custom-token UI repair from TASK-256;
- generic CSS expression support for other widgets;
- arbitrary `calc()`, CSS variables, classes, style declarations, or theme token
  expressions unless a later shared contract explicitly supports them.

## Sub-Tasks

- [x] Define the accepted Spacer custom length grammar.
- [x] Extend the Spacer-owned custom length normalizer so it accepts existing
  tokens, bare numbers, `px`, bounded viewport units, and a constrained
  `clamp(min, preferred, max)` form.
- [x] Keep invalid values falling back to deterministic defaults without
  throwing in render paths.
- [x] Update editor copy and shared-helper hooks so authors know which units are
  accepted without widening Divider semantics.
- [x] Add runtime/normalizer and editor tests for accepted viewport/fluid values
  and unsafe CSS strings falling back before they reach CSS custom properties.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/spacer.tsx` | Add safe viewport/fluid parsing and normalization while preserving existing token/px behavior and public data markers. |
| `core/admin/ui/widgets/editors/TokenOrPixelField.tsx` | Keep Divider defaults intact while exposing opt-in normalization/copy hooks that Spacer can consume. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | Replace px-only Spacer copy with truthful viewport/clamp guidance and reuse the Spacer-owned normalizer. |
| `tests/vitest/widgets/spacer.test.tsx` | Add normalization and SSR assertions for viewport units, canonical `clamp()`, unsafe fallback, and fixed-mode hidden-value preservation. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Add editor assertions for the new help text, viewport/clamp entry, and invalid custom-length feedback. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | Keep the shared-helper regression lane aligned with the default px-only validation copy that Divider still uses. |
| `_docs/_WIDGETS/SPACER.md` | Document the final accepted length grammar and rejected unsafe patterns. |

## Implementation Pseudocode

```ts
const viewportLengthPattern = /^\d+(?:\.\d+)?(?:vh|dvh|svh|vw)$/i;
const clampBoundaryLengthPattern = /^\d+(?:\.\d+)?(?:px|rem)$/i;
const clampPreferredLengthPattern = /^\d+(?:\.\d+)?(?:vh|dvh|svh|vw)$/i;
const clampLengthPattern = /^clamp\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i;

function normalizeClampSegment(value: string, pattern: RegExp): string | undefined {
  const trimmed = value.trim();
  if (!pattern.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

function normalizeSpacerCustomHeightInput(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (isSpacerToken(trimmed)) return trimmed;
  if (numberPattern.test(trimmed)) return `${trimmed}px`;
  if (pxPattern.test(trimmed)) return trimmed.toLowerCase();
  if (viewportLengthPattern.test(trimmed)) return trimmed.toLowerCase();

  const match = clampLengthPattern.exec(trimmed);
  if (!match) return undefined;

  const minimum = normalizeClampSegment(match[1], clampBoundaryLengthPattern);
  const preferred = normalizeClampSegment(match[2], clampPreferredLengthPattern);
  const maximum = normalizeClampSegment(match[3], clampBoundaryLengthPattern);
  if (!minimum || !preferred || !maximum) return undefined;

  return `clamp(${minimum}, ${preferred}, ${maximum})`;
}
```

Data flow:

1. `normalizeSpacerData()` calls the Spacer-owned normalizer for desktop,
   tablet, and mobile values.
2. `TokenOrPixelField` stays px-only by default; Spacer opts into the wider
   grammar through explicit `normalizeCustomValue` and copy props.
3. `SpacerBlock` writes normalized values to `data-spacer-*` markers and CSS
   custom properties.
4. `resolveSpacerCssHeight()` maps known tokens to rem values and returns
   already-validated custom values unchanged.
5. Unsafe custom strings are rejected at the Spacer normalizer/render contract
   by falling back to the breakpoint default. The schema still only owns object
   shape plus string-field validation.

Error handling:

- Reject `calc()`, `url()`, semicolons, CSS variables, negative lengths,
  unsupported units such as `lvh`, standalone `rem`, and malformed `clamp()` by
  falling back to the relevant default.
- Reject `clamp()` when `min`/`max` are not `px|rem`, or when the `preferred`
  slot is not one of `vh|dvh|svh|vw`.
- Do not throw during render for legacy malformed payloads.
- Preserve existing `none` and pixel behavior while keeping Divider's shared
  helper contract px-only by default.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema remains strict for object shape and known
  string fields. Unsafe CSS value safety is enforced by Spacer normalization.
- Anti-abuse: accepted length values are grammar-limited and cannot contain raw
  CSS declarations, URLs, scripts, comments, semicolons, CSS variables, or
  unbounded class names.
- Secret handling: no secrets in Spacer data, DOM markers, diagnostics, or
  reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If this leaf is committed or moved to `Done` separately from TASK-284-05, also
  run root `bun run lint`, `bun run gates:coderso`,
  `bun run scan:security:strict`, and `bun run precommit`.

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
- Divider keeps the default px-only shared-helper behavior while Spacer opts
  into the wider grammar explicitly.
- Editor copy accurately describes the accepted custom length grammar.

## Completion Notes (2026-05-21)

- Spacer now accepts `vh`, `dvh`, `svh`, and `vw` custom heights plus canonical
  `clamp(min, preferred, max)` values, while continuing to normalize bare
  numbers like `48` to `48px`.
- The final `clamp()` contract is intentionally narrow: `min` and `max` must be
  `px` or `rem`, and the `preferred` segment must be a viewport unit.
- Unsafe inputs such as standalone `rem`, malformed `clamp()`, `calc()`, CSS
  variables, URLs, semicolons, and unsupported units now fall back before they
  reach runtime CSS variables or public `data-spacer-*` markers.
- Spacer consumes additive `TokenOrPixelField` hooks for truthful copy and
  validation while Divider continues to use the default px-only branch.
