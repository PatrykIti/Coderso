# TASK-061-02: Writing Canvas Block Contract and Normalization
# FileName: TASK-061-02_Writing_Canvas_Block_Contract_and_Normalization.md

**Priority:** High  
**Category:** Core/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-061-01  
**Status:** To Do

---

## Overview
Wprowadzic nowy typ bloku `writing-canvas` jako glowny kontener tresci dokumentowej oraz znormalizowac jego payload.

## Scope
1. Rozszerzyc `PostBlockType` o `writing-canvas`.
2. Zdefiniowac payload writing canvas (node tree / sections / inline media refs).
3. Dodac normalizacje i limity (rozmiar, liczba nodow, dlugosci tekstu).
4. Dodac deterministic serializer/deserializer.
5. Zachowac compatibility z obecnymi blokami `paragraph/heading/list/...`.

## Files to Create / Change
- `core/services/posts/editor/postBlockDocument.ts`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/services/posts/editor/postRichTextSchema.ts`
- `core/services/posts/editor/postBlockLegacyAdapter.ts`
- `tests/unit/posts/post-block-document-writing-canvas.test.ts` (new)
- `tests/unit/posts/post-block-normalizer-writing-canvas.test.ts` (new)

## Pseudocode
```ts
type WritingCanvasNode =
  | { type: "paragraph"; text: RichText }
  | { type: "heading"; level: 2|3|4|5|6; text: RichText }
  | { type: "list"; ordered: boolean; items: RichText[] }
  | { type: "image"; mediaId: string; wrap: "none"|"left"|"right"; width: number }
  | { type: "quote"; text: RichText };

type WritingCanvasContent = {
  version: 1;
  nodes: WritingCanvasNode[];
};

normalizeWritingCanvas(content):
  assert object
  sanitize every node
  clamp widths/lengths
  ensure deterministic IDs/order
```

## Acceptance Criteria
1. `writing-canvas` jest wspierany przez model dokumentu i normalizer.
2. Normalizacja odrzuca niebezpieczne lub nieznane nody.
3. Legacy dokumenty nadal sa akceptowane.

## Testing Requirements
- Unit dla schemy i normalizacji `writing-canvas`.
- Unit dla legacy adaptera.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
