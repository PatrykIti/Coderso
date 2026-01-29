# TASK-007-01: Settings Model and Service
# FileName: TASK-007-01_Settings_Model_and_Service.md

**Priority:** Medium  
**Category:** CMS/Settings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** Done (2026-01-29)  

---

## Overview

Utworzenie tabeli `settings` oraz warstwy serwisowej do odczytu/zapisu ustawien
z walidacja typow i allow-lista kluczy.

**Zakres:**
- `settings` table w DB (key/value JSONB + updatedAt).
- `settingsService` z typowanymi kluczami i defaultami.
- Walidacja wartosci po kluczu (string vs token overrides).

---

## Architecture

```
core/db/schema.ts
core/services/settings/settingsService.ts
core/services/theme/tokenValidation.ts
tests/unit/settings/settingsService.test.ts
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | Add `settings` table | `key` as PK, `value` JSONB |
| `core/services/settings/settingsService.ts` | CRUD + defaults | allow-list keys |
| `core/services/theme/tokenValidation.ts` | `assertTokenOverrides` | token schema validation |
| `tests/unit/settings/settingsService.test.ts` | Unit tests | set/get/list/delete, reject unknown |

### Settings defaults (current)

```ts
const DEFAULT_SETTINGS = {
  "site.name": "Nextless",
  "site.locale": "en",
  "design.tokens": {} as DesignTokenOverrides,
};
```

### Service behavior

- `listSettings()` zwraca defaults + nadpisania z DB.
- `getSetting(key)` zwraca default jesli brak wpisu w DB.
- `setSetting()` i `setSettings()` waliduja typy zgodnie z kluczem.
- Nieznane klucze -> `settings_key_invalid`.

---

## Testing Requirements

- `tests/unit/settings/settingsService.test.ts`
  - set/get/list/delete
  - reject unknown key
  - `design.tokens` przechodzi przez validator

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md` (settings table)
- `_docs/CMS_API.md` (settings endpoints described in 007-02)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-settings-and-design-tokens.md`
