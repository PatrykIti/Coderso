# TASK-101-05: Admin UI Assistant Chat and Modes
# FileName: TASK-101-05_Admin_UI_Assistant_Chat_and_Modes.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-03, TASK-101-04, TASK-006-42  
**Status:** Done (2026-02-09)

---

## Overview

Implementacja UI asystenta w panelu admina:
- panel czatu,
- switch trybu (`docs-only` / `llm-rag`),
- widok zrodel i confidence,
- fallback states i onboarding hints.

---

## UX Requirements

1. Assistant panel jako optional dock/drawer.
2. Tryb domyslny z global settings, user moze zmienic (jesli policy pozwala).
3. Odpowiedz zawsze pokazuje `Sources` (klikane sciezki/sekcje).
4. Oznaczenie trybu i fallbacku (`LLM failed, switched to docs-only`).
5. Czytelny empty state: "Zapytaj gdzie cos jest w dokumentacji".
6. Przy backendzie `db` pokazywany badge `Internal Docs` przy zrodlach.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/services/assistantClient.ts` | new | status/chat/reindex client |
| `core/admin/ui/assistant/AssistantPanel.tsx` | new | chat shell + messages |
| `core/admin/ui/assistant/AssistantMessage.tsx` | new | answer + sources + fallback/backend badges |
| `core/admin/ui/assistant/AssistantModeSwitch.tsx` | new | docs-only / llm-rag |
| `core/admin/ui/assistant/AssistantEmptyState.tsx` | new | starter prompts |
| `core/admin/ui/layouts/AdminShell.tsx` | update | mount panel trigger for protected admin screens |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | update | shortcut to assistant settings |
| `tests/unit/admin/assistantClient.test.ts` | new | API client coverage |
| `tests/unit/ui/assistant-panel.test.tsx` | new | render states for panel/mode switch/message/empty state |

---

## Accessibility Requirements

- Full keyboard navigation.
- ARIA labels for mode switch and source links.
- Screen reader-friendly source citation format.
- High-contrast compliance with Admin theme tokens.

---

## Testing Requirements

- UI: sends question, renders answer, renders sources.
- UI: fallback banner appears when provider error occurs.
- UI: mode persistence in user settings.
- UI: disabled assistant hides panel entry points.

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (admin assistant UI integration)
- `_docs/CMS_API.md` (frontend contracts for assistant payloads)
- `_docs/_TASKS/README.md` status updates after completion

---

## Changelog Entry

- `_docs/_CHANGELOG/202-2026-02-09-assistant-admin-ui-chat-and-modes.md`

---

## Implementation Notes (Done)

- Added `core/admin/services/assistantClient.ts` with typed API wrappers:
  - `getAssistantStatus`
  - `sendAssistantMessage`
  - `reindexAssistantDocs`
- Added assistant UI module:
  - `core/admin/ui/assistant/AssistantPanel.tsx`
  - `core/admin/ui/assistant/AssistantModeSwitch.tsx`
  - `core/admin/ui/assistant/AssistantMessage.tsx`
  - `core/admin/ui/assistant/AssistantEmptyState.tsx`
- `AssistantPanel` behavior:
  - loads global status (`/assistant/status`) + user preferences (`/user-settings`)
  - hides trigger when assistant is disabled globally or per-user (`assistant.ui.enabled=false`)
  - persists mode changes via `assistant.mode` user setting
  - sends chat with page/locale context and renders fallback/source metadata
- Mounted assistant entry point in `core/admin/ui/layouts/AdminShell.tsx`.
- Added General Settings topbar hint in `core/admin/ui/settings/GeneralSettingsPage.tsx`.
- Extended `core/admin/services/userSettingsClient.ts` with assistant user keys.
- Added tests:
  - `tests/unit/admin/assistantClient.test.ts`
  - `tests/unit/ui/assistant-panel.test.tsx`
