# TASK-464-05: Extract Layers Command Palette And Template Picker Modules
# FileName: TASK-464-05-Extract-Layers-Command-Palette-And-Template-Picker-Modules.md

**Parent Task:** TASK-464
**Priority:** High
**Category:** Pages / Admin UI / Editor Shell
**Estimated Effort:** Large
**Dependencies:** TASK-464-02, TASK-464-03
**Status:** ⏳ To Do

---

## Overview

Extract the remaining large Page Editor UI subsurfaces that are not the canvas
or floating toolbar: layers overlay/tree rows, command palette insertion flow,
template library picker/application flow, delete confirmation ownership, and
small shell helpers that currently keep `PageEditor.tsx` large and hard to
reuse.

Hard constraint: **no UX/UI changes**. Preserve layer row labels and actions,
command palette grouping/search/active-index behavior, template picker labels
and insertion semantics, delete confirmation copy, keyboard behavior, focus
behavior, and all existing data attributes.

---

## Sub-Tasks

- [ ] [TASK-464-05-L01](TASK-464-05-L01-Extract-Layers-Tree-And-Row-Actions.md): Extract layers tree and row actions.
- [ ] [TASK-464-05-L02](TASK-464-05-L02-Extract-Command-Palette-State-And-Insert-Flow.md): Extract command palette state and insert flow.
- [ ] [TASK-464-05-L03](TASK-464-05-L03-Extract-Template-Picker-And-Delete-Confirmation-Flow.md): Extract template picker and delete confirmation flow.

---

## Implementation Pseudocode

```tsx
export type PageEditorLayersProps = {
  document: PageDocumentV2;
  selection: PageEditorSelectionState;
  device: PageBreakpoint;
  actions: PageEditorLayerActions;
};

export function PageEditorLayers(props: PageEditorLayersProps) {
  return <LayersDialog>{renderSectionRows(props.document.sections)}</LayersDialog>;
}

export type PageEditorCommandPaletteProps = {
  query: string;
  activeIndex: number;
  sectionOptions: readonly InsertableSectionOption[];
  blockOptions: readonly InsertableBlockOption[];
  templateOptions: readonly PageTemplateSummary[] | null;
  pendingTargets: PageEditorPendingInsertTargets;
  actions: PageEditorCommandActions;
};

export function applyPageTemplateSelection(
  template: PageTemplateDetail,
  target: PageTemplateInsertTarget
): PageDocumentV2 {
  const sections = instantiatePageTemplateSections(template.document);
  return insertSectionsAtTarget(sections, target);
}
```

Expected data flow:

- Parent `PageEditor` owns document state and passes typed actions down.
- Layers and command palette never mutate documents directly except through
  injected callbacks.
- Template picker uses host `templateLibrary` callbacks and the existing Page
  template schema helper for safe section instantiation.

Error handling:

- Missing template library disables the template picker without affecting
  section/block insertion.
- Failed template load surfaces the existing bounded error copy and does not
  mutate the document.
- Stale layer paths fail closed and keep the current selection rather than
  throwing.

Regression-test shape:

- Tests cover command palette section/block insertion, pending targeted insert,
  add-beside insert, layer select/move/add, template option loading, and
  template section id regeneration.
- Tests assert existing visible copy and data attributes remain stable.

---

## Security Contract

- Template summaries/descriptions render as text, never HTML.
- Template application must normalize/instantiate through the existing Page v2
  schema helper and regenerate ids; no raw document splice from untrusted data.
- Command palette option labels come from registries or sanitized host data.
- Extracted modules remain browser-safe and client-free except for injected
  host callbacks.

---

## Testing Requirements

- New focused Vitest suites for extracted layers/command/template helpers if
  practical.
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
- `_docs/_CHANGELOG/` on completion.
