# TASK-107-03: Assistant Unavailable and Docs-Not-Ready Minimal State Handling
# FileName: TASK-107-03_Assistant_Unavailable_and_Docs_Not_Ready_Minimal_State_Handling.md

**Priority:** Medium  
**Category:** Admin/UI + Assistant Runtime UX  
**Estimated Effort:** Small  
**Dependencies:** TASK-107-02  
**Status:** Done (2026-03-20)

---

## Overview

Uproscic stany niedostepnosci asystenta tak, aby nie zamienialy drawera w ekran ustawien, ale nadal czytelnie komunikowaly brak gotowosci runtime.

---

## Scope

1. `docs not ready` ma pozostac minimalistycznym stanem w obrebie okna rozmowy.
2. `load error` / `disabled` nie moga generowac administracyjnego szumu w drawerze.
3. Jesli potrzebny jest komunikat o konfiguracji, ma byc copy-only albo secondary hint, bez przewagi nad chat UX.

---

## Sub-Tasks

1. Doprecyzowac copy dla `disabled`, `error`, `docs not ready`.
2. Ograniczyc liczbę CTA i zredukowac status screen do minimalistycznej formy.
3. Dopisac testy dla nie-konfiguracyjnego renderu tych stanow.

---

## Files

- `core/admin/ui/assistant/AssistantPanel.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-lazy-load.test.tsx`

---

## Testing Requirements

- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`

---

## Completion Notes (2026-03-20)

- Simplified `loading`, `error`, `disabled`, and `docs-not-ready` states so they no longer resemble a settings surface.
- Removed settings CTAs from availability states and kept only minimal runtime copy.
