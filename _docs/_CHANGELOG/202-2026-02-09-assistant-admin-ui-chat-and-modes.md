# 202-2026-02-09 - Assistant admin UI chat and modes

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-101-05, TASK-101

## Summary
- Added Admin UI assistant drawer with chat flow, mode switching, source visibility, and fallback UX.

## Key Changes
- Admin/API client: Added `core/admin/services/assistantClient.ts` for:
  - `GET /assistant/status`
  - `POST /assistant/chat`
  - `POST /assistant/reindex`
- Admin/UI: Added assistant module:
  - `core/admin/ui/assistant/AssistantPanel.tsx`
  - `core/admin/ui/assistant/AssistantModeSwitch.tsx`
  - `core/admin/ui/assistant/AssistantMessage.tsx`
  - `core/admin/ui/assistant/AssistantEmptyState.tsx`
- Admin/UI layout: Mounted global assistant entrypoint in `core/admin/ui/layouts/AdminShell.tsx`.
- Admin/settings: Added topbar helper copy in `core/admin/ui/settings/GeneralSettingsPage.tsx` to direct users to assistant usage.
- User preferences: Extended `core/admin/services/userSettingsClient.ts` with assistant keys:
  - `assistant.mode`
  - `assistant.ui.enabled`
  - `assistant.ui.avatarEnabled`
  - `assistant.ui.avatarAsset`
- Tests:
  - `tests/unit/admin/assistantClient.test.ts`
  - `tests/unit/ui/assistant-panel.test.tsx`
