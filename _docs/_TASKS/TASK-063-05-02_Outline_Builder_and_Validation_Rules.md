# TASK-063-05-02: Outline Builder and Validation Rules
# FileName: TASK-063-05-02_Outline_Builder_and_Validation_Rules.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-05-01, TASK-062-02  
**Status:** Done (2026-02-24)

---

## Overview
Zbudowac outline dokumentu z walidacja heading hierarchy.

---

## Scope
1. Zebrac headingi z `heading` block + writing-canvas heading nodes.
2. Wykryc: empty heading, skipped levels, duplicate H1 patterns.
3. Powiazac outline item z anchor/block selection.

---

## Files to Create / Change
- `core/services/posts/editor/postDocumentOutline.ts`
- `tests/unit/posts/post-document-outline.test.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts` (integration point)

---

## Pseudocode
```ts
items = collectHeadings(document)
validateSequence(items)
attach warnings per item
return outline model
```

---

## Acceptance Criteria
1. Outline wykrywa problemy hierarchii.
2. Mapowanie do anchorow jest spójne z TASK-062.

---

## Testing Requirements
- Unit: validation scenarios.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
