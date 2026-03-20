# TASK-106: Assistant Drawer Runtime UX and Configuration Separation
# FileName: TASK-106_Assistant_Drawer_Runtime_UX_and_Configuration_Separation.md

**Priority:** High  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101, TASK-058-05  
**Status:** Done (2026-03-20)

---

## Overview

Naprawic UX topbarowego drawera Assistant tak, aby zachowywal sie jak surface rozmowy, a nie jak mieszanka:
- pustego czatu,
- lazy-load placeholdera,
- inline konfiguratora runtime,
- i stanu "docs not ready".

Aktualny problem:
- po otwarciu drawera user widzi prompty/pole rozmowy zanim runtime jest gotowy,
- po dojsciu `status` panel doklada `AssistantModeSwitch` i blok avatara, przez co wyglada jak przelaczenie do trybu konfiguracji,
- przy `indexReady=false` UX jest nieczytelny i moze sugerowac, ze drawer "przelaczyl sie" na ekran ustawien.

Docelowo topbarowy drawer ma byc conversation-first:
- loading = tylko loading shell,
- ready = chat + prompty + composer,
- docs-not-ready = chat shell + czytelny blocking banner,
- disabled/error = jasny komunikat i link do dedykowanych ustawien,
- konfiguracja nie dominuje glownego surface rozmowy.

---

## Architecture / UX Contract

1. `AssistantPanel` jest runtime chat drawerem, nie ekranem ustawien globalnych.
2. Zaawansowana konfiguracja asystenta pozostaje w dedykowanym ekranie:
   - `core/admin/ui/settings/AssistantSettingsPage.tsx`
   - `core/admin/ui/settings/AssistantSettingsCard.tsx`
3. Drawer nie renderuje prompt chips, transcript shell ani composer przed zakonczeniem lazy-load runtime.
4. `docs not ready` nie moze wizualnie wygladac jak wejscie w konfiguracje; to ma byc wariant runtime status, nie inny ekran.
5. User preferences typu `assistant.mode` / avatar nie moga zajmowac glownego miejsca nad rozmowa podczas normalnego otwierania drawera.
6. Lazy-load ma pozostac single-shot i kompatybilny z dotychczasowym request dedupe/caching contract.

---

## Sub-Tasks

1. `TASK-106-01` - Assistant drawer UX contract and render-state matrix.
2. `TASK-106-02` - Assistant drawer loading, empty, disabled, and docs-not-ready rendering.
3. `TASK-106-03` - Assistant configuration separation and settings entrypoints.
4. `TASK-106-04` - QA, docs, changelog, and closure.

---

## Files to Change

- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/AssistantEmptyState.tsx`
- `core/admin/ui/assistant/AssistantModeSwitch.tsx`
- `core/admin/ui/layouts/AdminShell.tsx` (only if topbar affordance/copy changes)
- `core/admin/ui/settings/AssistantSettingsPage.tsx`
- `core/admin/ui/settings/AssistantSettingsCard.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

---

## Acceptance Criteria

1. Opening Assistant from the topbar never shows prompt chips/composer before runtime readiness is known.
2. The primary drawer no longer appears to switch from "chat" into "configuration" after hydration.
3. `docs not ready` is presented as a runtime status banner in the same conversation shell.
4. Global assistant configuration remains discoverable from dedicated settings surfaces.
5. User-facing behavior is covered by targeted UI tests for loading, ready, disabled, and docs-not-ready states.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- Run additional targeted UI/admin-shell suite if the topbar affordance or layout contract changes.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` (on completion)

---

## Completion Notes (2026-03-20)

- Reworked `AssistantPanel` into a conversation-first drawer with explicit `loading`, `error`, `disabled`, `ready`, and `docs-not-ready` behavior.
- Hid assistant preferences behind an explicit user action instead of rendering configuration controls by default after runtime hydration.
- Added a canonical entrypoint to `Settings -> Assistant` from the drawer and kept prompt chips/composer hidden until runtime is ready.
- Added targeted Vitest coverage for the panel state helpers and revalidated lint/typecheck.
