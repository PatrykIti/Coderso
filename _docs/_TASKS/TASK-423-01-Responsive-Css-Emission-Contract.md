# TASK-423-01: Responsive CSS Emission Contract
# FileName: TASK-423-01-Responsive-Css-Emission-Contract.md

**Parent Task:** TASK-423
**Priority:** High
**Category:** Pages / Public Runtime / Rendering
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Freeze the public responsive-delivery contract before touching the runtime:
which section and block overrides can be expressed as CSS, which selectors and
breakpoints own the emitted rules, and which responsive deltas must remain
editor/preview-only because they change content rather than style.

This subtask owns the schema-to-CSS mapping for the audit finding from
`_docs/AUDIT/_cross-responsive-2026-06-10.md`: desktop remains the base markup,
tablet/mobile deltas emit scoped `@media` rules, and `responsive[bp].props`
stays explicitly unsupported until a separate content-override contract exists.

---

## Sub-Tasks

- [x] TASK-423-01-L01: Map responsive deltas to scoped media rules.

## Implementation Pseudocode

```ts
type ResponsiveCssScope =
  | { kind: "section"; id: string }
  | { kind: "block"; id: string };

type ResponsiveCssRuleMap = Map<string, string[]>;

export function buildResponsiveCssPlan(document: PageDocumentV2) {
  return {
    breakpoints: pageResponsiveMediaBounds,
    rules: collectResponsiveCssRules(document),
    unsupportedPropOverrides: collectResponsivePropOverrideDiagnostics(document),
  };
}

function collectResponsiveCssRules(document: PageDocumentV2): ResponsiveCssRuleMap {
  // Walk sections + nested blocks, convert layout/style/spacing/visibility deltas
  // into selector-scoped declarations, and skip anything that cannot be mapped
  // safely to CSS.
}
```

Expected data flow:

- `pageDocumentV2` remains the owner of normalized responsive deltas.
- The CSS plan walks the unflattened document, not the desktop-resolved render
  tree.
- Section and block ids are CSS-escaped before interpolation.
- Unsupported keys fail closed into diagnostics, not guessed CSS.

Error handling:

- Empty override sets emit no selectors.
- Unsafe or missing ids drop that scope from CSS output.
- Content overrides remain diagnostics-only until a separate contract lands.

Regression-test shape:

- Vitest covers deterministic selector ordering, breakpoint bounds, escaping,
  empty documents, and unmappable override diagnostics.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** unchanged public page and preview GET routes.
- **RBAC:** unchanged.
- **CSRF:** not applicable.
- **Rate-limit bucket:** unchanged public-site bucket.
- **Validation:** emitted CSS uses only normalized/clamped values and escaped
  selectors.
- **Anti-abuse controls:** no raw user strings may reach `<style>` output.

---

## Testing Requirements

- New Vitest suite for the responsive CSS planner/builder.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

---

## Completion Notes

Completed 2026-06-11: core/services/pages/pageResponsiveCss.ts (pure, deterministic, fail-closed diagnostics, exported scope-attribute constants incl. the block visual-element hook) with snapshot-stable Vitest coverage.
