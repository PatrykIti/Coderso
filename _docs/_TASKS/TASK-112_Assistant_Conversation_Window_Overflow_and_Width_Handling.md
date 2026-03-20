# TASK-112: Assistant Conversation Window Overflow and Width Handling
# FileName: TASK-112_Assistant_Conversation_Window_Overflow_and_Width_Handling.md

**Priority:** Medium  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-108  
**Status:** Done (2026-03-20)

---

## Overview

Naprawic zachowanie okna rozmowy asystenta dla długich odpowiedzi: treść ma pozostawać w obrębie panelu, zawijać się poziomo, scrollować pionowo i nie nachodzić na composer oraz przycisk `Send`.

---

## Sub-Tasks

1. Dodać wrapping i overflow protection dla wiadomości usera i asystenta.
2. Ustabilizować układ `ScrollArea + composer`, aby długie treści nie nachodziły na footer wysyłki.
3. Dodać bezpieczne, ograniczone rozszerzanie szerokości panelu rozmowy przez usera.
4. Dolożyć helper/test dla clampowania szerokości i anchored panel dimensions.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-20)

- Added safer message wrapping and overflow handling for long assistant responses.
- Kept the composer/send row anchored below the scrollable transcript area.
- Added controlled width resizing with viewport-safe clamp behavior.
