# TASK-106-02: Assistant Drawer Loading, Empty, Disabled, and Docs-Not-Ready Rendering
# FileName: TASK-106-02_Assistant_Drawer_Loading_Empty_Disabled_and_Docs_Not_Ready_Rendering.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-106-01  
**Status:** Done (2026-03-20)

---

## Overview

Naprawic lifecycle renderowania `AssistantPanel`, tak aby drawer nie pokazywal mylacych treści zanim runtime zostanie zhydradowany i zeby `docs not ready` bylo czytelnym stanem runtime, a nie wrazeniem wejscia do konfiguratora.

---

## Scope

1. Przebudowac gating renderu w `AssistantPanel.tsx`:
   - przed `isReady=true` renderowac tylko loading shell,
   - nie renderowac `AssistantEmptyState` ani composer przed zakonczeniem lazy-load.
2. Ujednolicic empty transcript state:
   - prompt chips pojawiaja sie dopiero po gotowym runtime,
   - transcript area nie "przeskakuje" po dociagnieciu `status`.
3. Uporzadkowac disabled/error/docs-not-ready:
   - `disabled` = jasny komunikat + entrypoint do settings/preferences,
   - `loadError` = retry state bez dodatkowego szumu,
   - `docs not ready` = blocking banner nad chatem/composerem, bez zmiany charakteru ekranu.
4. Zachowac aktualny lazy-load contract i brak dodatkowych request loops.

---

## Sub-Tasks

1. Wprowadzic loading-only shell przed `isReady`.
2. Odrzucic render prompt chips/composer przed hydration.
3. Ujednolicic bannery i blokady dla `disabled`, `error`, `docs not ready`.
4. Dopisac/uzupelnic testy UI dla nowych stanow.

---

## Files

- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/AssistantEmptyState.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-lazy-load.test.tsx`

---

## Testing Requirements

- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- Add assertions for:
  - no empty-state prompts before runtime ready,
  - docs-not-ready banner rendered without config takeover,
  - disabled state blocks composer cleanly,
  - ready state shows prompt chips only after hydration.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md` (if state copy/behavior changes)

---

## Completion Notes (2026-03-20)

- Gated prompt chips and composer behind runtime readiness.
- Added a dedicated `docs-not-ready` transcript placeholder instead of falling back to the normal empty chat prompts.
- Added targeted helper coverage for panel and conversation state resolution.
