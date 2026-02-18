# TASK-054-10-09: Media Delivery Access Modes
# FileName: TASK-054-10-09_Media_Delivery_Access_Modes.md

**Priority:** High  
**Category:** Media / Storage / Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005-09, TASK-038-07, TASK-020-11-03  
**Status:** Done (2026-02-18)

---

## Goal
Add configurable media delivery access mode:
- `public` (default),
- `internal` (authenticated session or API key).

## Scope
1. Storage settings model extension for media delivery access.
2. Settings UI control in Storage page.
3. Runtime `/media/*` access gate enforcement.
4. Tests + docs.

## Sub-Tasks
- `TASK-054-10-09-01`: Storage settings model + admin UI delivery controls
- `TASK-054-10-09-02`: `/media/*` runtime gate (session/API key) + driver behavior
- `TASK-054-10-09-03`: Tests, docs, changelog closure

## Files (planned)
- `core/services/media/mediaAccess.ts` (new)
- `core/services/settings/storageSettings.ts`
- `core/server/validation/settingsSchemas.ts`
- `core/admin/services/settingsClient.ts`
- `core/admin/ui/settings/StorageSettingsPage.tsx`
- `core/server/httpServer.ts`
- `tests/unit/media/mediaAccess.test.ts` (new)
- `tests/unit/settings/storageSettings.test.ts`
- `tests/unit/ui/storage-settings.test.tsx`
- `tests/unit/server/httpServer.test.ts` (or focused media gate test file)

## Acceptance Criteria
1. Storage settings expose delivery access mode with sensible defaults.
2. `/media/*` blocks anonymous requests in internal mode.
3. Internal mode allows:
   - authenticated session,
   - API key with `media.read` scope.
4. Public mode preserves current behavior.
5. Coverage added for settings normalization and runtime gate outcomes.

## Delivered
- Extended storage settings contract with `delivery.accessMode` (`public` / `internal`).
- Added Delivery Access controls in Settings -> Storage UI.
- Hardened `/media/*` runtime:
  - internal mode requires authenticated session or API key scope (`media.read`),
  - public mode preserves existing behavior.
- Added media access unit tests and integration test scaffold for DB-backed runtime gate checks.
