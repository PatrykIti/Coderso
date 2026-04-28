# TASK-057-01: Post Block Document Contract and Backward Compatibility
# FileName: TASK-057-01_Post_Block_Document_Contract_and_Backward_Compatibility.md

**Priority:** High  
**Category:** Domain Model  
**Estimated Effort:** Medium  
**Dependencies:** TASK-055  
**Status:** Done (2026-02-21)

---

## Goal
Zdefiniowac stabilny kontrakt danych dla blokowego dokumentu posta i zapewnic kompatybilnosc z juz zapisanymi postami.

## Scope
1. Dodac typed kontrakt `PostBlockDocument` (versioned JSON).
2. Dodac normalizator i walidator (strict, deterministic).
3. Dodac adapter legacy -> blocks (np. stare `data.content` string do bloku paragraph/richtext).
4. Ustalic model zapisu w `entry.data` dla typu `post`.

## Data Contract (draft)
```ts
type PostBlockDocument = {
  version: 1;
  blocks: PostBlock[];
  meta: {
    title?: string;
    excerpt?: string;
    readingTimeMinutes?: number;
  };
};

type PostBlock = {
  id: string;
  type:
    | "paragraph"
    | "heading"
    | "list"
    | "quote"
    | "code"
    | "image"
    | "separator"
    | "callout"
    | "button"
    | "embed";
  attrs: Record<string, unknown>;
  content?: unknown;
};
```

## Files to Create / Change
- `core/services/posts/editor/postBlockDocument.ts` (new)
- `core/services/posts/editor/postBlockNormalizer.ts` (new)
- `core/services/posts/editor/postBlockLegacyAdapter.ts` (new)
- `core/server/validation/postSchemas.ts`
- `core/services/content/postsService.ts`
- `tests/unit/posts/postBlockDocument.test.ts` (new)
- `tests/unit/posts/postBlockLegacyAdapter.test.ts` (new)

## Pseudocode
```ts
normalizePostDocument(input):
  if isLegacyRichText(input):
    return convertLegacyToBlockDocument(input)
  assert input.version === 1
  blocks = input.blocks.map(normalizeBlock)
  return { version: 1, blocks, meta: normalizeMeta(input.meta) }

normalizeBlock(block):
  assert allowedType(block.type)
  assert stringId(block.id)
  attrs = normalizeAttrsByType(block.type, block.attrs)
  content = normalizeContentByType(block.type, block.content)
  return { id, type, attrs, content }
```

## Acceptance Criteria
1. Kazdy post ma deterministycznie znormalizowane `document` (bez losowych kluczy).
2. Stare posty (legacy content) otwieraja sie w nowym edytorze bez crasha.
3. Walidacja backend odrzuca niepoprawne bloki z jasnym kodem bledu.
4. Unit testy pokrywaja normalizacje i migracje legacy.
