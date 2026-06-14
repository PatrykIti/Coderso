# TASK-464-05: Extract Layers Command Palette And Template Picker Modules
# FileName: TASK-464-05-Extract-Layers-Command-Palette-And-Template-Picker-Modules.md

**Parent Task:** TASK-464
**Priority:** High
**Category:** Pages / Admin UI / Editor Shell
**Estimated Effort:** Large
**Dependencies:** TASK-464-02, TASK-464-03
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Extract the remaining large Page Editor UI subsurfaces that are not the canvas
or floating toolbar: layers overlay/tree rows, command palette insertion flow,
template library picker/application flow, delete confirmation ownership, and
small shell helpers that currently keep `PageEditor.tsx` large and hard to
reuse.

Each leaf must rewire `PageEditor.tsx` to consume the extracted module within
the same leaf. TASK-464-07 is final cleanup and convergence, not the first large
module swap.

Hard constraint: **no UX/UI changes**. Preserve layer row labels and actions,
command palette grouping/search/active-index behavior, template picker labels
and insertion semantics, delete confirmation copy, keyboard behavior, focus
behavior, and all existing data attributes.

---

## Sub-Tasks

- [x] [TASK-464-05-L01](TASK-464-05-L01-Extract-Layers-Tree-And-Row-Actions.md): Extract layers tree and row actions.
- [x] [TASK-464-05-L02](TASK-464-05-L02-Extract-Command-Palette-State-And-Insert-Flow.md): Extract command palette state and insert flow.
- [x] [TASK-464-05-L03](TASK-464-05-L03-Extract-Template-Picker-And-Delete-Confirmation-Flow.md): Extract template picker and delete confirmation flow.

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
  document: PageDocumentV2,
  template: PageTemplateDetail
): PageDocumentV2 {
  const sections = instantiatePageTemplateSections(template.document);
  return appendTemplateSections(document, sections);
}
```

Expected data flow:

- Parent `PageEditor` owns document state and passes typed actions down.
- Layers and command palette never mutate documents directly except through
  injected callbacks.
- Template picker uses host `templateLibrary` callbacks and the existing Page
  template schema helper for safe section instantiation.
- Template application preserves the current append-only behavior unless the
  TASK-464-01 parity baseline proves an existing targeted template path.

Error handling:

- Missing template library disables the template picker without affecting
  section/block insertion.
- Failed template load surfaces the existing bounded error copy and does not
  mutate the document.
- Stale layer paths fail closed and keep the current selection rather than
  throwing.

Regression-test shape:

- Tests cover command palette section/block insertion, pending targeted insert,
  add-beside insert, layer select/move/add, template option loading,
  append-only template application, and template section id regeneration.
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

- `bun run test:vitest -- tests/vitest/ui/page-editor-layers.test.tsx tests/vitest/ui/page-editor-command-palette.test.tsx tests/vitest/ui/page-editor-template-picker.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
- `_docs/_CHANGELOG/` on completion.
