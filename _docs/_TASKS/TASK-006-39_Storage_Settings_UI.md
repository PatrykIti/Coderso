# TASK-006-39: Storage Settings UI (Visual)
# FileName: TASK-006-39_Storage_Settings_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005, TASK-007, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Create the “Settings → Storage” screen with local/S3/Azure options and
connection test. Visual-only layer until storage settings endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/39-storage-settings/code.html`
- `_docs/UI/admin_panel/39-storage-settings/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Storage provider selector (Local, S3, Azure).
- Provider config fields.
- Test connection button.

## Shadcn Components

- `Card`, `Button`, `Input`, `Select`, `Separator`, `Badge`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/StorageSettingsPage.tsx` | create | main layout |
| `core/admin/ui/settings/StorageProviderCard.tsx` | create | provider fields |

## Data + State

- `GET /settings/storage`
- `PATCH /settings/storage`
- `POST /settings/storage/test`

## Unit Tests

- `tests/unit/ui/storage-settings.test.tsx` renders cards.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-storage-settings-ui.md`
