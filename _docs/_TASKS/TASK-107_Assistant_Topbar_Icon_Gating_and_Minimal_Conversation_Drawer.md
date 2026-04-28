# TASK-107: Assistant Floating Launcher, Visibility Gating, and Minimal Conversation Window
# FileName: TASK-107_Assistant_Topbar_Icon_Gating_and_Minimal_Conversation_Drawer.md

**Priority:** High  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101, TASK-106  
**Status:** Done (2026-03-20)

---

## Overview

Wprowadzic follow-up UX dla asystenta w adminie, bo aktualny drawer nadal nie odpowiada oczekiwanemu product contract.

Docelowy kontrakt:
- w topbarze nie ma przycisku `Assistant`,
- zamiast tego w obrebie UI pojawia sie pływajacy launcher w stylu chmurki/wiadomosci,
- launcher jest widoczny tylko wtedy, gdy globalne `assistant.enabled=true`,
- launcher mozna przesunac, aby nie zaslanial widoku,
- po kliknieciu user dostaje minimalistyczne okno rozmowy,
- jezeli ustawiony jest avatar asystenta, launcher zmienia sie z ikony wiadomosci na avatar,
- surface rozmowy pokazuje tylko:
  - liste gotowych pytan/propozycji,
  - historie rozmowy,
  - pole do wpisania tekstu,
- okno rozmowy nie renderuje inline konfiguracji, preferences, settings CTA ani innych elementow administracyjnych jako glownej tresci,
- wszystkie ustawienia asystenta pozostaja w globalnym `Settings`, a w samym oknie rozmowy moga istniec co najwyzej opcje dotyczace samego widgetu czatu.

To jest swiadoma korekta produktu po `TASK-106`: tam drawer zostal uporzadkowany technicznie, ale nadal nie odpowiada oczekiwanej formie "assistant chat surface".

---

## Product Contract

1. Entry point:
   - brak przycisku `Assistant` w topbarze,
   - pływajacy launcher w obrebie UI,
   - message-bubble by default,
   - draggable.
2. Visibility:
   - brak launchera, gdy `assistant.enabled=false` globalnie.
3. Launcher visuals:
   - jezeli avatar jest ustawiony, launcher korzysta z avatara zamiast zwyklej chmurki wiadomosci.
4. Conversation window:
   - conversation-first,
   - bez inline preferences/configuration blocks,
   - bez top-level przyciskow `Preferences` / `Settings`.
5. Content model:
   - fixed starter prompts,
   - transcript,
   - composer.
6. Global settings ownership:
   - wlaczanie asystenta i wszystkie jego opcje runtime pozostaja w globalnym `Settings`.
7. Error/availability states:
   - maja nie rozwalac minimalistycznego charakteru UI,
   - nie moga zmieniac okna rozmowy w ekran ustawien.

---

## Sub-Tasks

1. `TASK-107-01` - assistant topbar removal and global visibility gating for the launcher.
2. `TASK-107-02` - minimal conversation drawer contract and rendering cleanup.
3. `TASK-107-03` - assistant unavailable/docs-not-ready minimalist state handling.
4. `TASK-107-05` - floating draggable assistant launcher.
5. `TASK-107-06` - avatar-backed launcher surface.
6. `TASK-107-04` - QA, docs, changelog, and closure.

---

## Files to Change

- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/AssistantEmptyState.tsx`
- `core/admin/ui/assistant/*launcher*` (new helper/component if needed)
- `core/admin/services/assistantClient.ts` (only if status-loading contract needs a helper surface)
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

---

## Acceptance Criteria

1. The topbar no longer shows a textual `Assistant` button.
2. The UI shows a floating assistant launcher only when global assistant settings enable the assistant.
3. The launcher can be repositioned by the user and does not permanently obscure admin content.
4. When an assistant avatar is configured, the launcher uses the avatar surface instead of the default message-bubble icon.
5. The conversation window contains only conversation-oriented UI, not global configuration controls.
6. Starter prompts and the composer remain the primary surface in the empty state.
7. Availability issues (`disabled`, `docs not ready`, `load error`) do not turn the conversation window into a settings screen.

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

---

## Completion Notes (2026-03-20)

- Replaced the topbar `Assistant` button concept with a floating launcher mounted at the shell level.
- Gated launcher visibility by global `assistant.enabled` without adding a separate shell fetch path.
- Reduced the conversation window to starter prompts, transcript, composer, and minimalist runtime status handling.
- Added avatar-backed launcher support driven by global assistant settings.
