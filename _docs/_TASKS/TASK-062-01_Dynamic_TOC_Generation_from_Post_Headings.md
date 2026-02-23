# TASK-062-01: Dynamic TOC Generation from Post Headings
# FileName: TASK-062-01_Dynamic_TOC_Generation_from_Post_Headings.md

**Priority:** High  
**Category:** CMS/Posts + Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-062  
**Status:** To Do

---

## Overview
Dodac dynamiczne generowanie spisu tresci z naglowkow posta, tak aby TOC byl zawsze zgodny z aktualnym dokumentem.

---

## Sub-Tasks
1. Dodac nowy block type `toc` do post document contract.
2. Zbudowac heading index builder dla documentu posts (blocks + writing-canvas nodes).
3. Mapowac `toc` block do runtime payloadu TOC (`items[]` z `level`, `text`, `anchorId`).
4. Renderowac TOC w runtime preview/public.
5. Dodac inserter metadata dla bloku TOC w edytorze postow.

---

## Files to Create / Change
- `core/services/posts/editor/postBlockDocument.ts`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `tests/unit/posts/post-block-normalizer-writing-canvas.test.ts`
- `tests/unit/posts/post-block-runtime-renderer.test.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`

---

## Pseudocode
```ts
type TocItem = {
  anchorId: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

function buildHeadingIndex(document): TocItem[] {
  const items: TocItem[] = [];
  for (const block of document.blocks) {
    if (block.type === "heading") {
      items.push(readHeadingBlock(block));
    }
    if (block.type === "writing-canvas") {
      for (const node of block.content.nodes) {
        if (node.type === "heading") items.push(readWritingHeadingNode(node));
      }
    }
  }
  return items;
}

function mapRuntimeTocBlock(block, document) {
  const headingIndex = buildHeadingIndex(document);
  return { type: "toc", content: { items: headingIndex } };
}
```

---

## Acceptance Criteria
1. `toc` block pojawia sie w inserterze post editora.
2. Runtime renderuje liste TOC z linkami do naglowkow.
3. TOC respektuje aktualny document state i nie wymaga recznej synchronizacji.
4. Brak headingow => TOC pokazuje user-friendly empty state (nie blad runtime).

---

## Testing Requirements
- Unit tests dla normalizacji `toc` block.
- Unit tests runtime mapper/renderer TOC.
- Integration test dla obecnosci TOC block w editor shell.

---

## Documentation Updates Required
- `_docs/CMS_API.md` (post block contract + runtime payload)
- `_docs/ARCHITECTURE.md` (runtime mapping flow)

