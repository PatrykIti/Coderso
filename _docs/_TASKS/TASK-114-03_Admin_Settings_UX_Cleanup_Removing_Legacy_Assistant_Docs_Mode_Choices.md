# TASK-114-03: Admin Settings UX Cleanup Removing Legacy Assistant Docs Mode Choices
# FileName: TASK-114-03_Admin_Settings_UX_Cleanup_Removing_Legacy_Assistant_Docs_Mode_Choices.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-114-01  
**Status:** Done (2026-03-20)

---

## Overview

Uproscic `Assistant Settings`, aby UI nie sugerowalo juz wyboru starego modelu
assistant docs ani wspierania `_docs/filesystem`.

---

## Scope

1. Usunac lub ukryc legacy docs mode choices z settings UI.
2. Zostawic czytelny operator contract:
   - official corpus = `docs/`
   - DB seed = required
   - `Run reindex` = operational action
3. Upewnic sie, ze copy nie sugeruje rownoleglego wspierania starej i nowej sciezki.

---

## Sub-Tasks

1. Ograniczyc assistant settings UI do wspieranego modelu.
2. Dopracowac copy/operator messaging.
3. Dolozyc render-level tests pod nowy contract.

---

## Files

- `core/admin/ui/settings/AssistantSettingsPage.tsx`
- `core/admin/ui/settings/AssistantSettingsCard.tsx`
- `tests/vitest/ui/assistant-settings.test.tsx`

---

## Testing Requirements

- targeted assistant settings UI tests

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/SETTINGS.md`

---

## Completion Notes (2026-03-20)

- Kept Assistant Settings focused on the DB-seeded `docs/` contract only.
- Synced operator-facing copy so the settings screen no longer implies a supported legacy docs mode.
