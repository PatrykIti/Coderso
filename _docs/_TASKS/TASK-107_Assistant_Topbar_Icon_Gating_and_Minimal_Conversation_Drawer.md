# TASK-107: Assistant Topbar Icon Gating and Minimal Conversation Drawer
# FileName: TASK-107_Assistant_Topbar_Icon_Gating_and_Minimal_Conversation_Drawer.md

**Priority:** High  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101, TASK-106  
**Status:** To Do

---

## Overview

Wprowadzic follow-up UX dla asystenta w adminie, bo aktualny drawer nadal nie odpowiada oczekiwanemu product contract.

Docelowy kontrakt:
- w topbarze nie ma przycisku `Assistant`, tylko icon-only entrypoint w stylu chmurki/wiadomosci,
- ikonka jest widoczna tylko wtedy, gdy globalne `assistant.enabled=true`,
- po kliknieciu user dostaje minimalistyczne okno rozmowy,
- surface rozmowy pokazuje tylko:
  - liste gotowych pytan/propozycji,
  - historie rozmowy,
  - pole do wpisania tekstu,
- drawer nie renderuje inline konfiguracji, preferences, settings CTA ani innych elementow administracyjnych jako glownej tresci.

To jest swiadoma korekta produktu po `TASK-106`: tam drawer zostal uporzadkowany technicznie, ale nadal nie odpowiada oczekiwanej formie "assistant chat surface".

---

## Product Contract

1. Entry point:
   - icon-only,
   - osadzony w topbarze,
   - bez labelki `Assistant`.
2. Visibility:
   - brak entrypointu, gdy `assistant.enabled=false` globalnie.
3. Drawer:
   - conversation-first,
   - bez inline preferences/configuration blocks,
   - bez top-level przyciskow `Preferences` / `Settings`.
4. Content model:
   - fixed starter prompts,
   - transcript,
   - composer.
5. Error/availability states:
   - maja nie rozwalac minimalistycznego charakteru UI,
   - nie moga zmieniac drawera w ekran ustawien.

---

## Sub-Tasks

1. `TASK-107-01` - assistant topbar icon-only entrypoint and global visibility gating.
2. `TASK-107-02` - minimal conversation drawer contract and rendering cleanup.
3. `TASK-107-03` - assistant unavailable/docs-not-ready minimalist state handling.
4. `TASK-107-04` - QA, docs, changelog, and closure.

---

## Files to Change

- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/AssistantEmptyState.tsx`
- `core/admin/services/assistantClient.ts` (only if status-loading contract needs a helper surface)
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

---

## Acceptance Criteria

1. The topbar shows only a message-bubble-style assistant icon, without `Assistant` text.
2. The icon is not rendered when global assistant settings disable the assistant.
3. The drawer surface contains only conversation-oriented UI, not inline configuration controls.
4. Starter prompts and the composer remain the primary surface in the empty state.
5. Availability issues (`disabled`, `docs not ready`, `load error`) do not turn the drawer into a settings screen.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- Run additional targeted admin-shell/topbar suite when entrypoint wiring changes.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` (on completion)
