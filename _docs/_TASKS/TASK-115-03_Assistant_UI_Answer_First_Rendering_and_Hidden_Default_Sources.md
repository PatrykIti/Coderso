# TASK-115-03: Assistant UI Answer-First Rendering and Hidden Default Sources
# FileName: TASK-115-03_Assistant_UI_Answer_First_Rendering_and_Hidden_Default_Sources.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-115-01, TASK-115-02  
**Status:** To Do

---

## Overview

Dostosowac render w UI do nowego contractu:
- glowna odpowiedz jako content,
- `Sources` ukryte w domyslnym user-facing flow.

---

## Scope

1. `AssistantMessage` ma renderowac main answer bez wrazenia „index output”.
2. `Sources` nie sa domyslnie pokazywane zwyklemu userowi.
3. Metadata typu confidence/mode zostaje tylko jesli wspiera odpowiedz, a nie
   konkuruje z nia o uwage.

---

## Detailed Work

1. Ustalic answer hierarchy:
   - answer first
   - fallback info second
   - sources hidden or debug-only
2. Usunac `Sources` block z defaultowego renderu.
3. Zostawic mozliwosc przyszlego debug mode bez blokowania obecnego UX.

---

## Files

- `core/admin/ui/assistant/AssistantMessage.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`

---

## Testing Requirements

- UI tests ensuring:
  - answer-first rendering,
  - no default `Sources` block,
  - fallback/error badges still work

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
