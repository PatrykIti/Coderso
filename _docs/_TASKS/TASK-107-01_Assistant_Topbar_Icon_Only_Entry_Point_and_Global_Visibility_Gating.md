# TASK-107-01: Assistant Topbar Icon-Only Entry Point and Global Visibility Gating
# FileName: TASK-107-01_Assistant_Topbar_Icon_Only_Entry_Point_and_Global_Visibility_Gating.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-107  
**Status:** To Do

---

## Overview

Zmienic topbarowy entrypoint asystenta z przycisku tekstowego na icon-only trigger i uzaleznic jego widocznosc od globalnego `assistant.enabled`.

---

## Scope

1. Zamienic przycisk `Assistant` na ikonke/chmurke wiadomosci.
2. Podpiac visibility gating pod globalne `assistant.enabled`.
3. Nie renderowac entrypointu w admin UI, jesli assistant jest globalnie wylaczony.
4. Zachowac zgodnosc z istniejacym lazy-load/request budget contract.

---

## Sub-Tasks

1. Ustalic source-of-truth dla globalnego `assistant.enabled` po stronie topbar shell.
2. Podmienic text button na compact icon affordance.
3. Dolozyc testy na visibility gating i brak labelki.

---

## Files

- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`

---

## Testing Requirements

- Targeted admin-shell/topbar suite.
- Revalidate assistant lazy-load behavior after entrypoint gating change.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
