# TASK-005-09: Storage Settings Runtime Config
# FileName: TASK-005-09_Storage_Settings_Runtime_Config.md

**Priority:** High  
**Category:** CMS/Media + Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005-06, TASK-005-07, TASK-007  
**Status:** Done (2026-01-28)  

---

## Overview

Wprowadzamy runtime konfiguracje storage z poziomu Admin UI (WordPress‑like), bez restartu serwera.
Sekrety storage beda przechowywane w DB **zaszyfrowane** i odszyfrowywane tylko w runtime przy uzyciu **jednego master key w ENV**.

**Wazne:** hasla uzytkownikow sa juz bezpiecznie przechowywane (hashy argon2) i ten task ich nie dotyka.

## Cele

- Konfiguracja storage w Admin UI (local / S3 / Azure) bez restartu.
- Sekrety (S3/Azure) zapisujemy zaszyfrowane w DB.
- UI pokazuje tylko maskowane wartosci ("••••"), bez podgladu sekretow.
- Runtime adapter korzysta z configu z DB, cache invalidowany po zmianie.

## Nowe/zmieniane elementy

### 1) Settings schema (DB)
Dodajemy nowa grupa ustawien `storage.*` w settings:

- `storage.driver`: `"local" | "s3" | "azure"`
- `storage.local.dir`
- `storage.publicBaseUrl`
- `storage.maxSizeBytes`
- `storage.allowedMime`

Sekrety (szyfrowane):
- `storage.s3.bucket`
- `storage.s3.region`
- `storage.s3.accessKey`
- `storage.s3.secretKey`
- `storage.s3.endpoint`
- `storage.azure.container`
- `storage.azure.account`
- `storage.azure.key`
- `storage.azure.connectionString`

### 2) Encryption helpers
Nowy modul (np. `core/services/security/secretStore.ts`):
- AES‑256‑GCM
- `encryptSecret(plain)` => `{ cipherText, iv, tag, keyVersion }`
- `decryptSecret(payload)`
- Master key z `MEDIA_SECRET_MASTER_KEY` (ENV), wymagany w prod.

W DB zapisujemy **tylko ciphertext**, nie plain.

### 3) Settings service
Rozszerzamy `core/services/settings/settingsService.ts`:
- `getStorageSettings()` zwraca runtime config z DB.
- `setStorageSettings(payload)` waliduje, szyfruje sekrety i zapisuje.
- Cache invalidation: po zapisie resetujemy cached adapter (np. `media/storage/index.ts`).

### 4) Media storage resolver
`getMediaStorageAdapter()` ma korzystac z ustawien z DB:
- `driver` + `baseUrl` + lokalna sciezka
- S3/Azure z DB (odszyfrowane)
- fallback: env tylko dla `MEDIA_SECRET_MASTER_KEY`

### 5) Admin API
Nowe endpointy:
- `GET /admin/api/settings/storage` (read)
- `PATCH /admin/api/settings/storage` (write)

Payload zawiera osobne pola dla sekretow:
- UI wysyla tylko nowe wartosci; puste znaczy "nie zmieniaj".

### 6) Admin UI
W `core/admin/ui/settings/StorageSettingsPage.tsx`:
- Wczytanie storage config
- Pola sekretow jako `••••` + przycisk "Update"
- Save zapisuje tylko zmienione sekrety
- Informacja: "Zmiana drivera nie wymaga restartu, ale nie migruje starych plikow"

## Implementation checklist (files)

| File | Action | Notes |
| --- | --- | --- |
| `core/services/security/secretStore.ts` | new | encrypt/decrypt helpers |
| `core/services/settings/storageSettings.ts` | new | load/save storage config |
| `core/services/media/storage/index.ts` | update | read config from DB + cache invalidation |
| `core/server/routes/settingsRoutes.ts` | update | add storage settings endpoints |
| `core/server/validation/settingsSchemas.ts` | update | schema for storage payload |
| `core/admin/services/settingsClient.ts` | update | add storage endpoints |
| `core/admin/ui/settings/StorageSettingsPage.tsx` | update | real wiring |

## Validation & security

- Master key: `MEDIA_SECRET_MASTER_KEY` required for decrypt/encrypt.
- Puste sekrety w payload = nie zmieniaj (nie nadpisuj).
- UI nigdy nie pokazuje plaintext sekretow.

## Tests

- `tests/unit/security/secretStore.test.ts`
- `tests/unit/settings/storageSettings.test.ts`
- `tests/unit/admin/settingsClient.test.ts` (storage endpoints)
- Update UI test if needed

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-storage-settings-runtime.md`
