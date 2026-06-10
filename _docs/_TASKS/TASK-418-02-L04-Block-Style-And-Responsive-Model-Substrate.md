# TASK-418-02-L04: Block Style And Responsive Model Substrate
# FileName: TASK-418-02-L04-Block-Style-And-Responsive-Model-Substrate.md

**Parent Subtask:** TASK-418-02
**Priority:** High
**Category:** Pages / Domain Contract / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-418-01
**Status:** ✅ Done
**Completed:** 2026-06-09

---

## Overview

Create the model substrate required before block controls, shared rendering, and
canvas parity can be correct. The current `PageBlockStyleV2` only supports
`align` and `width`, and block responsive overrides are normalized but not
resolved into rendered documents. This leaf expands the Pages v2 owner contract
for bounded block style and adds block-level responsive resolution for every
surface.

---

## Implementation Pseudocode

```ts
export type PageBlockStyleV2 = {
  align?: "left" | "center" | "right";
  width?: "auto" | "full";
  textColor?: string | null;
  background?: string | null;
  backgroundType?: PageBackgroundType;
  opacity?: number;
  radius?: number;
  shadow?: PageShadowToken;
  borderColor?: string | null;
  padding?: Partial<PageBoxSpacingV2>;
  margin?: Partial<PageBoxSpacingV2>;
};

export function resolvePageBlockForBreakpoint(block, breakpoint) {
  const override = breakpoint === "desktop" ? undefined : block.responsive?.[breakpoint];
  return normalizePageBlockRead({
    ...block,
    props: { ...block.props, ...(override?.props ?? {}) },
    style: { ...(block.style ?? {}), ...(override?.style ?? {}) },
    visibility: { ...block.visibility, ...(override?.visibility ?? {}) },
  });
}

export function resolvePageSectionForBreakpoint(section, breakpoint) {
  const resolvedSection = applySectionOverride(section, breakpoint);
  return {
    ...resolvedSection,
    blocks: resolvedSection.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
  };
}
```

Expected data flow:

- `pageDocumentV2` owns the expanded style type, defaults, clamps, and strict
  normalization.
- `pageDocumentV2` also owns the initial `pageBlockCapabilities` scaffold and
  keeps block prop/style/responsive metadata in one schema-first contract.
- `pageDocumentV2JsonSchema` must reject the same unknown block
  `props`/`style`/`responsive` fields that the write normalizer rejects; do not
  leave these nested nodes as broad `additionalProperties: true` objects.
- Responsive resolution applies section overrides first and block overrides
  recursively after nesting lands.
- Admin canvas, preview, public runtime, assistant validation, and control
  registry all import the same owner contract.

Error handling:

- Reject unknown block style keys in strict write mode.
- Clamp opacity/radius/spacing values and normalize invalid colors to safe
  defaults or reject them according to existing Pages rules.
- Desktop remains the base and never writes `responsive.desktop`.

Regression-test shape:

- Expanded block style normalizes with explicit defaults and rejects unknown
  keys.
- AJV/schema tests reject unknown block `props`, `style`, and responsive override
  fields in parity with the imperative normalizer.
- `block.responsive.mobile.props/style/visibility` changes the mobile resolved
  block and does not change desktop.
- Section resolution applies block overrides for every block in order.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages write routes only.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages write permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** strict reject-unknown validation for block style and
  responsive override payloads; all persisted payloads normalize through
  `pageDocumentV2`.
- **Anti-abuse controls:** clamp numeric style values to prevent oversized
  payloads/layout abuse; no public write endpoint is introduced.

---

## Testing Requirements

- Vitest pure tests for expanded block style normalization and strict unknown
  rejection.
- Vitest pure tests for block responsive resolver on desktop/tablet/mobile.
- Bun runtime test once the public renderer consumes the resolved block style.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`

---

## Closeout

- Expanded `PageBlockStyleV2` with bounded color/background/opacity/radius/
  shadow/border/spacing fields.
- Exported `pageBlockPropKeys`, `pageBlockCapabilities`, and
  `resolvePageBlockForBreakpoint` from `pageDocumentV2`.
- Tightened `pageDocumentV2JsonSchema` so block props/style/responsive and
  section responsive objects reject unknown fields in parity with write
  normalization.
- Changed block responsive props to sparse deltas and applied block overrides in
  `resolvePageDocumentForBreakpoint`.

Validation:

- `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts`
  - Passed: 13 tests.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core lint`
  - Passed.
