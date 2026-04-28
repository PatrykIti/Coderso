# 203-2026-02-09 - Assistant avatar rendering and preferences

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-101-06, TASK-101

## Summary
- Added optional assistant avatar layer with per-user preferences and safe fallback rendering.

## Key Changes
- Admin/UI: Added `core/admin/ui/assistant/avatarStates.ts` for avatar runtime state mapping (`idle`, `thinking`, `answer`).
- Admin/UI: Added `core/admin/ui/assistant/AssistantAvatar.tsx`:
  - detects asset kind (`image`, `video`, `glb/gltf`, fallback)
  - renders optional visual block without coupling chat flow to WebGL availability
  - uses placeholder fallback when runtime/asset is unavailable
- Admin/UI: Updated `core/admin/ui/assistant/AssistantPanel.tsx`:
  - avatar enable toggle persisted to `assistant.ui.avatarEnabled`
  - avatar asset URL persisted to `assistant.ui.avatarAsset`
  - avatar state changes based on chat lifecycle
- Admin/API types: Extended `core/admin/services/userSettingsClient.ts` with assistant avatar keys.
- Tests: Added `tests/unit/ui/assistant-avatar.test.tsx` and validated panel/client/admin-shell regressions.
- Docs:
  - `_docs/ARCHITECTURE.md` updated with optional avatar layer
  - `_docs/MEDIA_SPEC.md` updated with assistant avatar asset format guidance
