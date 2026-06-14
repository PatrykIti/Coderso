# TASK-464-03: Extract Reusable Page Authoring Canvas Module
# FileName: TASK-464-03-Extract-Reusable-Page-Authoring-Canvas-Module.md

**Parent Task:** TASK-464
**Priority:** High
**Category:** Pages / Admin UI / Canvas
**Estimated Effort:** Large
**Dependencies:** TASK-464-02
**Status:** ⏳ To Do

---

## Overview

Extract the Page v2 authoring canvas from `PageEditor.tsx` into a reusable
module. The new module should own section canvas chrome, block frames, ghost add
tiles, hidden block placeholders, inline text renderer wiring, canvas frame
props, canvas chrome slot rendering, and device frame sizing.

Hard constraint: **no UX/UI changes**. The extracted canvas must copy the
current markup, class names, data attributes, focus/hover behavior, ghost tile
behavior, scroll clearance usage, canvas frame widths, typography token bridge,
and selection behavior.

---

## Sub-Tasks

- [ ] [TASK-464-03-L01](TASK-464-03-L01-Extract-Canvas-Frame-And-Section-Shell.md): Extract canvas frame and section shell.
- [ ] [TASK-464-03-L02](TASK-464-03-L02-Extract-Block-Frames-Ghost-Tiles-And-Slot-Affordances.md): Extract block frames, ghost tiles, and slot affordances.
- [ ] [TASK-464-03-L03](TASK-464-03-L03-Extract-Inline-Edit-And-Canvas-Runtime-Binding-Wiring.md): Extract inline edit and canvas runtime binding wiring.

---

## Implementation Pseudocode

```tsx
export type PageAuthoringCanvasProps = {
  document: PageDocumentV2;
  resolvedSections: readonly PageSectionV2[];
  baseSectionsById: ReadonlyMap<string, PageSectionV2>;
  selection: ResolvedPageEditorSelection;
  device: PageBreakpoint;
  canvasDataByBlockId: PageRuntimeDataByBlockId;
  canvasChrome?: ReactNode;
  toolbarClearance: number;
  actions: PageAuthoringCanvasActions;
};

export function PageAuthoringCanvas(props: PageAuthoringCanvasProps) {
  return (
    <CanvasScroller clearance={props.toolbarClearance}>
      <CanvasFrame device={props.device}>
        {props.canvasChrome}
        {props.resolvedSections.map((section) => (
          <PageAuthoringSectionCanvas key={section.id} {...sectionProps} />
        ))}
      </CanvasFrame>
    </CanvasScroller>
  );
}
```

Expected data flow:

- `PageEditor` computes document/resolved sections and passes them down.
- The canvas module emits only typed callbacks: select section, select block,
  add block target, add block beside, start inline edit, commit inline edit.
- The canvas module must not call admin clients, save documents, open route
  previews, or mutate host-specific cache.

Error handling:

- Missing base sections or stale block paths fail closed: render the available
  section, clear selection through existing parent callbacks, and never throw
  during render.
- Runtime preview binding failures stay represented by the existing
  `canvasDataByBlockId` fail-closed data shape.

Regression-test shape:

- Assert canvas still renders the same `data-page-editor-canvas-frame`,
  section, block, selected, responsive, visibility, ghost, and chrome markers.
- Assert selecting section/block still opens the same floating toolbar target.
- Assert Page Templates and Menu Design canvas hosts still render through the
  same module.

---

## Security Contract

- The canvas module must render text through React text nodes or existing
  sanitized renderer contracts only.
- Inline text start/commit must keep using the owner sanitizer from
  `pageInlineEditContract` or the centralized sanitizer from TASK-464-06.
- No `dangerouslySetInnerHTML` in the extracted canvas module.
- Style values passed to canvas renderers must come from normalized Page v2
  fields, registry clamps, or sanitizer helpers.

---

## Testing Requirements

- New focused Vitest UI suite for `PageAuthoringCanvas` if practical.
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
- `_docs/_CHANGELOG/` on completion.
