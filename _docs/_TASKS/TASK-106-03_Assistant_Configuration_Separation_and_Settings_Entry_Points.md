# TASK-106-03: Assistant Configuration Separation and Settings Entry Points
# FileName: TASK-106-03_Assistant_Configuration_Separation_and_Settings_Entry_Points.md

**Priority:** High  
**Category:** Admin/UI + Assistant Settings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-106-01  
**Status:** Done (2026-03-20)

---

## Overview

Oddzielic konfiguracje asystenta od topbarowego drawera rozmowy. User ma miec jasnosc:
- drawer = rozmowa / status runtime,
- settings page = konfiguracja globalna,
- ewentualne lekkie preferences nie moga dominowac nad czatem.

---

## Scope

1. Usunac lub zredukowac inline konfiguracje z glownego drawera:
   - `AssistantModeSwitch`
   - avatar toggle / avatar asset input
2. Wybrac docelowy pattern:
   - calkowite przeniesienie do dedykowanego settings screen,
   - albo secondary affordance typu `Open settings` / `Open preferences`.
3. Zachowac discoverability:
   - user musi wiedziec, gdzie zmienic ustawienia asystenta,
   - drawer ma miec czytelny link/CTA do `Assistant Settings`, zamiast pelnego konfiguratora inline.
4. Dopracowac copy w drawerze tak, aby nie sugerowal ekranu administracyjnego ustawien.

---

## Sub-Tasks

1. Okreslic, ktore preference pozostaja inline, a ktore sa przeniesione.
2. Dodac czytelny entrypoint do `Assistant Settings`.
3. Usunac wrazenie "przelaczenia na konfigurator" po hydration.

---

## Files

- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/AssistantModeSwitch.tsx`
- `core/admin/ui/settings/AssistantSettingsPage.tsx`
- `core/admin/ui/settings/AssistantSettingsCard.tsx`
- `core/admin/ui/layouts/AdminShell.tsx` (if topbar affordance changes)
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`

---

## Testing Requirements

- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx`
- Run additional targeted admin-shell/ui-integration suite if the topbar contract changes.
- Add assertions that the primary drawer no longer renders inline configuration controls as first-class content.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`

---

## Completion Notes (2026-03-20)

- Removed the default post-hydration "inline configurator" feel from the main chat surface.
- Moved preferences behind an explicit drawer action and added a canonical `Settings -> Assistant` entrypoint.
- Kept local drawer preferences available without making them the primary content of the conversation drawer.
