# TASK-107-01: Assistant Topbar Removal and Global Visibility Gating
# FileName: TASK-107-01_Assistant_Topbar_Icon_Only_Entry_Point_and_Global_Visibility_Gating.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-107  
**Status:** Done (2026-03-20)

---

## Overview

Usunac topbarowy entrypoint asystenta i uzaleznic widocznosc nowego launchera od globalnego `assistant.enabled`.

---

## Scope

1. Usunac przycisk `Assistant` z topbara.
2. Podpiac visibility gating launchera pod globalne `assistant.enabled`.
3. Nie renderowac launchera w admin UI, jesli assistant jest globalnie wylaczony.
4. Zachowac zgodnosc z istniejacym lazy-load/request budget contract.

---

## Sub-Tasks

1. Ustalic source-of-truth dla globalnego `assistant.enabled` po stronie shell/UI.
2. Usunac topbar button bez dokladania zbednego request overhead.
3. Dolozyc testy na visibility gating.

---

## Files

- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`

---

## Testing Requirements

- Targeted admin-shell/launcher visibility suite.
- Revalidate assistant lazy-load behavior after entrypoint gating change.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`

---

## Completion Notes (2026-03-20)

- Removed the textual assistant trigger from `TopBar`.
- Moved launcher mounting to shell-level floating UI.
- Bound launcher visibility to global assistant settings instead of per-user drawer preferences.
