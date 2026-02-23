# TASK-063-06-03: Smart Paste Hardening and TOC Directives
# FileName: TASK-063-06-03_Smart_Paste_Hardening_and_TOC_Directives.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-06-02, TASK-062-03  
**Status:** To Do

---

## Overview
Domknac paste pipeline (Word/Docs) i dyrektywy TOC replacement bez regresji.

---

## Scope
1. Poprawic heurystyki heading level detection.
2. Wykrywac i usuwac Word TOC (`#_Toc...`) oraz triggerowac dynamic TOC block.
3. Dopilnowac aby paste nie wywoluje niepotrzebnego hydrate resetu.

---

## Files to Create / Change
- `core/services/posts/editor/postPasteNormalizer.ts`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/unit/posts/post-paste-normalizer.test.ts`
- `tests/integration/ui/post-editor-paste-from-word.test.tsx`

---

## Pseudocode
```ts
normalized = normalizePostPastePayload(input)
if normalized.directives.replaceWordTocWithDynamicToc: ensureSingleTocBlock()
apply sanitized nodes preserving heading hierarchy
```

---

## Acceptance Criteria
1. Paste z Word nie zostawia martwych TOC linkow.
2. Po paste nie ma reload petli edytora.

---

## Testing Requirements
- Unit: directives + heading mapping.
- Integration: long Word document fixture.

---

## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
