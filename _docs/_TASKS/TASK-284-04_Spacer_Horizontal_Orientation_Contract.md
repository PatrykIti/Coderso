# TASK-284-04: Spacer Horizontal Orientation Contract

# FileName: TASK-284-04_Spacer_Horizontal_Orientation_Contract.md

**Priority:** Low
**Category:** Widgets + Layout + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-284-02, TASK-284-03, TASK-284
**Status:** To Do

---

## Overview

Decide and implement, or explicitly defer, the horizontal Spacer behavior from
`_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`.

This leaf covers BF-05. The current research matrix intentionally rejects a
context-sensitive flex filler as the default Spacer behavior. Any horizontal
support must therefore be explicit, bounded, and honest about where it works.

## Scope Boundary

In scope:

- a product decision for horizontal spacing that is grounded in current page
  builder layout constraints;
- if accepted, a schema-backed `orientation` and width model with deterministic
  runtime output;
- editor copy that explains horizontal Spacer behavior and limitations.

Out of scope:

- Chakra-style flex filler behavior that only works by mutating parent layout;
- broad page-builder inline layout or flex/grid container redesign;
- arbitrary width classes or raw CSS;
- changing existing vertical Spacer payload behavior.

## Sub-Tasks

- [ ] Inspect current page-builder/container owners before implementation to
  confirm where a horizontal spacer can render truthfully.
- [ ] Decide whether TASK-284 should implement horizontal orientation now or
  mark it deferred in TASK-284-05 with a concrete owner/blocker.
- [ ] If implemented, add a bounded `orientation` model and width values while
  preserving default vertical behavior.
- [ ] Render horizontal Spacer with width CSS custom properties and a neutral
  height only in contexts where the output is truthful.
- [ ] Add editor controls and tests for orientation switching without data loss.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/spacer.tsx` | Add optional orientation/width schema, defaults, normalizer, CSS custom-property output, and backward-compatible vertical default if implementation proceeds. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | Add orientation controls and width inputs only after the runtime contract is decided. |
| `tests/vitest/widgets/spacer.test.tsx` | Add SSR assertions for vertical default and horizontal output if implemented. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Add editor assertions for orientation switching, copy, and value preservation if implemented. |
| `tests/vitest/widgets/renderer.test.tsx` | Run when public render shape or markers change. |
| `tests/unit/widgets/validator.test.ts` | Run or update if schema/defaults change. |
| `_docs/_WIDGETS/SPACER.md` | Document the decision, implementation, or explicit deferral. |
| `_docs/_WIDGETS/tmp/spacer/MATRIX.md` | Update if the final product decision changes the prior horizontal/flex-filler rejection. |

## Implementation Pseudocode

Decision guard:

```ts
type HorizontalSpacerDecision =
  | { status: "implement"; ownerContext: "inline-layout" | "block-compatible" }
  | { status: "defer"; reason: string; futureOwner: string };
```

If implemented:

```ts
type SpacerOrientation = "vertical" | "horizontal";

type SpacerData = {
  orientation?: SpacerOrientation;
  height?: ResponsiveLength;
  width?: ResponsiveLength;
  showGuideInEditor?: boolean;
};

function normalizeSpacerData(data: SpacerData, variant: string): SpacerData {
  const orientation = data.orientation === "horizontal" ? "horizontal" : "vertical";
  const dimension = orientation === "horizontal" ? normalizeWidth(data.width) : normalizeHeight(data.height);
  return { ...normalizedBase, orientation, ...dimension };
}
```

Render flow:

```tsx
function SpacerBlock({ data, variant, previewDevice }: SpacerBlockProps) {
  const normalized = normalizeSpacerData(data, variant);
  if (normalized.orientation === "horizontal") {
    return <div aria-hidden="true" data-spacer-orientation="horizontal" style={widthVars} />;
  }
  return <div aria-hidden="true" data-spacer-orientation="vertical" style={heightVars} />;
}
```

Error handling:

- Unknown orientation values normalize to `vertical`.
- Horizontal width values must use the same safe length grammar as
  TASK-284-02.
- If current page-builder contexts cannot display horizontal spacing honestly,
  do not implement a misleading no-op. Record the deferral in TASK-284-05 with a
  future owner.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: add any orientation/width fields to `spacerSchema`
  with bounded enum/string rules and validator tests.
- Anti-abuse: width values must pass the safe length parser; no raw classes,
  parent selectors, style declarations, script, or layout-mutating parent
  payloads.
- Secret handling: no secrets in Spacer data, DOM markers, reports, or
  diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when public
  render shape or markers change.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If this leaf is committed or moved to `Done` separately from TASK-284-05, also
  run root `bun run lint`, targeted Vitest/Bun lanes above,
  `bun run scan:security:strict`, and `bun run precommit`; otherwise keep this
  leaf open until TASK-284-05 runs the final family gate.

## Documentation Updates Required

- Update `_docs/_WIDGETS/SPACER.md` with the horizontal Spacer decision and
  behavior or the explicit deferral.
- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` row BF-05 after validation
  or deferral.
- Update `_docs/_WIDGETS/tmp/spacer/MATRIX.md` if the final decision changes
  the prior research conclusion.

## Changelog Policy

- Covered by the TASK-284 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Horizontal Spacer is either implemented with truthful bounded runtime behavior
  or deferred with a concrete blocker and future owner.
- Existing vertical Spacer payloads remain the default and render unchanged.
- Any new orientation/width fields are schema-backed, normalized, rendered,
  tested, and documented.
- The implementation does not mutate parent layout or introduce a context-only
  flex filler disguised as a general page spacer.
