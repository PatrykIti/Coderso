# TASK-063-06-02: Unified Inserter Slash Appender Flow
# FileName: TASK-063-06-02_Unified_Inserter_Slash_Appender_Flow.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-06-01, TASK-063-04-02  
**Status:** Done (2026-02-24)

---

## Overview
Ujednolicic logike dodawania blokow z 3 wejsc: inserter sidebar, slash command, appender.

---

## Scope
1. Wspolna funkcja insert orchestration.
2. Spójny target insertion (after selection/caret/index).
3. Wspolny telemetry/log i error mapping (jesli insert sie nie powiedzie).

---

## Files to Create / Change
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`

---

## Pseudocode
```ts
insertBlock(params: {source, type, position})
resolve insertion index from source context
dispatch single reducer action
```

---

## Acceptance Criteria
1. Kazda sciezka insertu daje ten sam wynik.
2. Brak rozjazdu miedzy slash i sidebar inserter.

---

## Testing Requirements
- Integration: same type insert from 3 sources => same document shape.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
