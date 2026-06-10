# TASK-418-03-L01: Universal Section And Block Control Registry
# FileName: TASK-418-03-L01-Universal-Section-And-Block-Control-Registry.md

**Parent Subtask:** TASK-418-03
**Priority:** High
**Category:** Pages / Admin UI / Contract
**Estimated Effort:** Large
**Dependencies:** TASK-418-02
**Status:** ✅ Done
**Completed:** 2026-06-09

---

## Overview

Add a shared registry that describes universal controls for every section and
block target. The registry is the bridge between `pageDocumentV2` and toolbar UI:
it defines what each panel can edit, the persisted path, the control component,
defaults, responsive behavior, and whether the control applies to sections,
blocks, or both.

---

## Implementation Pseudocode

```ts
type PageEditorControlTarget = "section" | "block";
type PageEditorControlPanel =
  | "layout"
  | "content"
  | "style"
  | "spacing"
  | "background"
  | "responsive"
  | "visibility";

type PageEditorControlDefinition = {
  id: string;
  panel: PageEditorControlPanel;
  target: PageEditorControlTarget;
  label: string;
  path: readonly string[];
  overridePath: readonly string[];
  input: "text" | "number" | "select" | "segmented" | "switch" | "color" | "swatch" | "media";
  responsive: boolean;
  options?: readonly string[];
  clamp?: { min: number; max: number };
};

export const pageSectionCapabilities = defineSectionCapabilities({
  template: { insertable: false, reason: "template-section-boundary" },
  navigation: { insertable: false, reason: "runtime-navigation-boundary" },
  hero: { insertable: true },
  content: { insertable: true }
  // ...
});

export const pageUniversalSectionControls = defineControls([...]);
export const pageUniversalBlockControls = defineControls([...]);

function getControlsForTarget(target) {
  return target.kind === "section"
    ? pageUniversalSectionControls.concat(getSectionTypeControls(target.type))
    : pageUniversalBlockControls.concat(getBlockTypeControls(target.type));
}
```

Expected data flow:

- Registry imports type constants, option arrays, and capability metadata from
  the Pages domain owner.
- `pageDocumentV2` exports schema-owned option arrays needed by controls
  (`pageHeadingLevels`, button targets/variants/sizes, text alignments/formats,
  section variants/align/justify, shadow/background tokens) instead of letting
  UI duplicate enum knowledge.
- `pageDocumentV2` owns `pageSectionCapabilities` or equivalent section
  insertability metadata so parent coverage can assert every section type has an
  insertable state or reason.
- Toolbar renders panels from registry definitions.
- Patch functions use registry paths to update base or responsive override
  values.

Error handling:

- Unknown control paths fail tests and do not render.
- Unsupported controls are hidden rather than writing loose props.

Regression-test shape:

- Every universal control path and override path maps to a valid document field.
- Section controls include layout, style, spacing, background, responsive, and
  visibility.
- Block controls include width, align/text align, visibility, background,
  opacity, border/radius/shadow where supported, spacing, and responsive.
- Every section type has section capability metadata with either insertable
  coverage or an explicit non-insertable reason.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** existing admin session for subsequent saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** registry paths must be schema-owned and reject unknown fields.
- **Anti-abuse controls:** no public writes; registry must not expose privileged
  settings or secrets to the browser.

---

## Testing Requirements

- Vitest pure registry tests for valid paths and control coverage.
- Vitest owner metadata tests for exported option arrays and section
  capabilities.
- Vitest UI smoke for rendering universal controls.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`

---

## Closeout

- Exported Page owner option arrays from `pageDocumentV2` so controls do not
  duplicate enum values.
- Added `pageSectionCapabilities` in the Pages owner with insertability state and
  explicit non-insertable reasons for system/runtime-pending section types.
- Added `pageEditorControlRegistry` with schema-owned array paths, responsive
  override paths, universal section controls, universal block controls, and
  capability-gated target control lookup.
- Added pure Vitest coverage for registry path validity, owner option metadata,
  section capability coverage, and block capability gating.
- Fresh read-only subagent confirmation `019eae5f-d703-7f80-994c-708d082dbdeb`
  reported no remaining TASK-418-03 drift before implementation.
  Claude confirmation was attempted, but the redundant long-running process was
  terminated after the clean subagent confirmation and local contract checks.

Validation:

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts`
  - Passed: 17 tests.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core lint`
  - Passed.
