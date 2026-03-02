# TASK-063-16-03: Section Paragraph Quote Roundtrip Normalizer and Runtime Parity
# FileName: TASK-063-16-03_Section_Paragraph_Quote_Roundtrip_Normalizer_and_Runtime_Parity.md

**Priority:** High  
**Category:** Core/Editor + Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-16-02  
**Status:** To Do

---

## Overview
Domknac parity modelu i runtime tak, aby `paragraph` i `quote` wykonane w `Section` nie tracily typu w parserze/serializerze/normalizerze i renderowaly sie poprawnie publicznie.

---

## Scope
1. Potwierdzic i doprecyzowac mapowanie `p <-> paragraph node`, `blockquote <-> quote node`.
2. Utrzymac parity przy roundtripie:
   - editor html -> writing-canvas nodes,
   - writing-canvas nodes -> editor html,
   - writing-canvas nodes -> runtime html.
3. Wyeliminowac przypadki degradacji `quote` do `paragraph` bez intencji usera.

---

## Detailed File-Level Plan
1. `core/services/posts/editor/postPasteNormalizer.ts`
   - testowalna stabilizacja parsera/serializera dla `paragraph/quote` node boundaries.
2. `core/services/posts/editor/postBlockNormalizer.ts`
   - ochrona kontraktu typu noda przy normalizacji dokumentu.
3. `core/services/posts/runtime/postBlockRuntimeMapper.ts`
   - parity mapowania `quote` node.
4. `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
   - pewne renderowanie `blockquote` dla `quote` nodes.

---

## Acceptance Criteria
1. Roundtrip nie zmienia typu noda bez komendy usera.
2. Runtime i canvas renderuja zgodnie z modelem.
3. Brak regresji w existing writing-canvas nodes.

---

## Testing Requirements (Target)
- `bun test tests/unit/posts/post-paste-normalizer.test.ts`
- `bun test tests/unit/posts/post-block-normalizer-writing-canvas.test.ts`
- `bun test tests/unit/posts/post-block-runtime-renderer.test.tsx`
- `bun test tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
