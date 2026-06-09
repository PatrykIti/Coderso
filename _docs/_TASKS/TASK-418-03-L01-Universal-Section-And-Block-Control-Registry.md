# TASK-418-03-L01: Universal Section And Block Control Registry
# FileName: TASK-418-03-L01-Universal-Section-And-Block-Control-Registry.md

**Parent Subtask:** TASK-418-03
**Priority:** High
**Category:** Pages / Admin UI / Contract
**Estimated Effort:** Large
**Dependencies:** TASK-418-02
**Status:** ⏳ To Do

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
  input: "text" | "number" | "select" | "switch" | "color" | "swatch" | "media";
  responsive: boolean;
  options?: readonly string[];
  clamp?: { min: number; max: number };
};

export const pageUniversalSectionControls = defineControls([...]);
export const pageUniversalBlockControls = defineControls([...]);

function getControlsForTarget(target) {
  return target.kind === "section"
    ? pageUniversalSectionControls.concat(getSectionTypeControls(target.type))
    : pageUniversalBlockControls.concat(getBlockTypeControls(target.type));
}
```

Expected data flow:

- Registry imports type constants and capability metadata from the Pages domain
  owner.
- Toolbar renders panels from registry definitions.
- Patch functions use registry paths to update base or responsive override
  values.

Error handling:

- Unknown control paths fail tests and do not render.
- Unsupported controls are hidden rather than writing loose props.

Regression-test shape:

- Every universal control path maps to a valid document field.
- Section controls include layout, style, spacing, background, responsive, and
  visibility.
- Block controls include width, align/text align, visibility, background,
  opacity, border/radius/shadow where supported, spacing, and responsive.

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
- Vitest UI smoke for rendering universal controls.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
