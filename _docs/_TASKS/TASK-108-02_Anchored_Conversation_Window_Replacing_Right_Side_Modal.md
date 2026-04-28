# TASK-108-02: Anchored Conversation Window Replacing Right-Side Modal
# FileName: TASK-108-02_Anchored_Conversation_Window_Replacing_Right_Side_Modal.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-108  
**Status:** Done (2026-03-20)

---

## Overview

Zmienic model otwierania rozmowy z pelnego prawego modala na okno rozmowy zakotwiczone przy floating launcherze.

---

## Sub-Tasks

1. Usunac right-side `Sheet` behavior dla rozmowy.
2. Dodac anchored floating conversation window powiazane pozycja z launcherem.
3. Dolozyc outside-click / `Escape` close contract.
4. Dopilnowac viewport clamp dla okna rozmowy na mniejszych ekranach.

---

## Testing Requirements

- Covered by assistant panel helper/UI suites for anchored position logic and runtime states.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`

---

## Completion Notes (2026-03-20)

- Conversation now opens as a floating panel emerging from the launcher area instead of claiming the full right side.
- Added anchored position helper and viewport-safe clamping for the conversation window.
