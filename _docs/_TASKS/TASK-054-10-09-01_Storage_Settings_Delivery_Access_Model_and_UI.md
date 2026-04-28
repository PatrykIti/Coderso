# TASK-054-10-09-01: Storage Settings Delivery Access Model and UI
# FileName: TASK-054-10-09-01_Storage_Settings_Delivery_Access_Model_and_UI.md

**Priority:** High  
**Category:** Settings Model + UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005-09  
**Status:** Done (2026-02-18)

---

## Goal
Extend Storage Settings with user-friendly media delivery access controls.

## Scope
1. Add `delivery.accessMode` to storage settings contract.
2. Extend settings schema validation and client types.
3. Add admin UI controls to configure mode (final UX: Media Library settings drawer).

## Pseudocode
```ts
// storageSettings.ts
StorageSettingsPublic.delivery = { accessMode: "public" | "internal" }
StorageSettingsUpdate.delivery?.accessMode
persist key: "storage.delivery.accessMode"
default: "public"

// MediaLibraryPage.tsx + MediaSettingsDrawer.tsx
load settings on drawer open
Select:
  - Public (recommended)
  - Internal (session or API key)
save via PATCH /admin/api/settings/storage { delivery: { accessMode } }
```

## Acceptance Criteria
1. UI save/load roundtrip persists selected mode.
2. Validation rejects invalid mode values.
3. Defaults remain backward compatible (`public`).

## Follow-up UX Update (2026-02-19)
- Delivery Access controls were moved from Settings -> Storage to Media Library (`/admin/media`) as a dedicated `Media settings` action beside `Upload New`.
- Storage page keeps provider and upload policy configuration only.
