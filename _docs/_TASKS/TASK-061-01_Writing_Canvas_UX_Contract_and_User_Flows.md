# TASK-061-01: Writing Canvas UX Contract and User Flows
# FileName: TASK-061-01_Writing_Canvas_UX_Contract_and_User_Flows.md

**Priority:** High  
**Category:** Product UX / Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-061  
**Status:** To Do

---

## Overview
Zdefiniowac finalny kontrakt UX dla "Writing Canvas" tak, aby user mial odczucie pracy jak w Word/Gutenberg przy zachowaniu architektury blokowej i runtime safety.

## Scope
1. Definicja domyslnego flow: `title -> writing canvas -> details`.
2. Definicja zachowania paste:
   - plain text,
   - rich HTML,
   - Word HTML,
   - mixed content z listami/naglowkami.
3. Definicja sterowania obrazami inline i wrap.
4. Definicja granicy miedzy writing canvas a "special blocks".
5. Definicja onboarding hints dla nietechnicznego usera.

## Files to Create / Change
- `_docs/_TASKS/TASK-061_Post_Editor_Writing_Canvas_and_Smart_Paste.md`
- `_docs/ARCHITECTURE.md`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` (UX anchors comments)
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` (contract markers)

## Pseudocode
```ts
editingFlow = [
  "set title",
  "paste or write in writing canvas",
  "add optional special block",
  "set details",
  "preview/publish"
];

pasteModes = {
  plain: normalizeToParagraphs,
  html: sanitizeAndMap,
  wordHtml: stripOfficeMarkupThenMap,
};
```

## Acceptance Criteria
1. Jest jedna, spojnna specyfikacja UX bez konfliktu miedzy ribbon/canvas/details.
2. Jest jasne kiedy user pracuje w writing canvas, a kiedy dodaje specjalne bloki.
3. Kontrakt obejmuje desktop i mobile.

## Testing Requirements
- Contract checklist review przed implementacja `061-02`.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
