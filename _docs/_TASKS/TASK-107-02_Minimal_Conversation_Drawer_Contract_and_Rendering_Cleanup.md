# TASK-107-02: Minimal Conversation Drawer Contract and Rendering Cleanup
# FileName: TASK-107-02_Minimal_Conversation_Drawer_Contract_and_Rendering_Cleanup.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-107  
**Status:** To Do

---

## Overview

Sprowadzic `AssistantPanel` do minimalistycznego okna rozmowy, bez konfiguracji runtime i bez dodatkowych action row ponad transcriptem.

---

## Scope

1. Usunac z glownego drawera:
   - `Preferences`,
   - `Settings`,
   - `AssistantModeSwitch`,
   - avatar/preferences/configuration blocks,
   - inne nie-konwersacyjne CTA.
2. Zostawic tylko:
   - starter prompts,
   - transcript/messages,
   - composer.
3. Dopilnowac, aby empty state wygladal jak assistant chat, a nie panel administracyjny.

---

## Sub-Tasks

1. Zamrozic minimalistyczny visual contract drawera.
2. Wyciac non-chat controls z primary conversation surface.
3. Dolozyc testy, ze empty state pozostaje prompt-plus-composer only.

---

## Files

- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/AssistantEmptyState.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`

---

## Testing Requirements

- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx`

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
