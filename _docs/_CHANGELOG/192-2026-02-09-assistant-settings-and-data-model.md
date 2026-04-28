# 192-2026-02-09 - Assistant settings and data model

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-101-01, TASK-101

## Summary
- Added assistant global and per-user settings model with validation, Admin UI controls, and payload wiring.

## Key Changes
- CMS/Settings: Extended global `settings` keys with `assistant.*` defaults, normalization, and cross-key consistency checks.
- CMS/Settings: Added user-level `assistant.mode`, `assistant.ui.enabled`, `assistant.ui.avatarEnabled`, and `assistant.ui.avatarAsset`.
- Admin/UI: Added `AssistantSettingsCard` to General Settings with grouped controls for docs paths, LLM provider/model, limits, and quotas.
- Admin/UI: Updated `AdminApp` settings mapping/save payload to include assistant settings end-to-end.
- Admin/API Client: Added typed assistant payload contracts in `settingsClient`.
- Tests: Added assistant validation coverage in settings/user-settings service tests and updated settings UI render checks.
- Docs: Updated API/security docs and added `_docs/SETTINGS.md` matrix for assistant settings keys.
