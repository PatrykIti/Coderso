# TASK-100-01: Settings Keys and Runtime Validation
# FileName: TASK-100-01_Settings_Keys_and_Runtime_Validation.md

**Priority:** High  
**Category:** Core/Settings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007, TASK-047  
**Status:** Done (2026-02-09)

---

## Overview

Dodajemy i formalizujemy kontrakt settings dla runtime URL i auth TTL.
Ten subtask daje bezpieczna baze pod kolejne kroki (resolver, auth services, wizard).

---

## Target Contract

### Canonical keys

```ts
type RuntimeSettings = {
  "site.publicBaseUrl": string | null;
  "auth.sessionTtlDays": number;
  "auth.resetTtlMinutes": number;
  "setup.completed": boolean;
};
```

### Compatibility alias

```ts
type LegacyAlias = "site.baseUrl";
```

Alias `site.baseUrl` nie jest osobnym source of truth.
Write/read alias mapuje sie na `site.publicBaseUrl`.

---

## Validation Rules

1. `site.publicBaseUrl`:
- `null` lub poprawny `http/https` URL
- normalizacja trailing slash

2. `auth.sessionTtlDays`:
- integer `>= 1` i `<= 365`

3. `auth.resetTtlMinutes`:
- integer `>= 5` i `<= 1440`

4. `setup.completed`:
- tylko boolean

---

## Pseudo-Implementation

```ts
// core/services/settings/settingsService.ts
const DEFAULT_SETTINGS = {
  // existing...
  "site.publicBaseUrl": null,
  "auth.sessionTtlDays": 14,
  "auth.resetTtlMinutes": 60,
  "setup.completed": false,
} as const;

function validateSettingValue(key: SettingKey, value: unknown) {
  if (key === "auth.sessionTtlDays") {
    return normalizeBoundedInt(value, 1, 365);
  }
  if (key === "auth.resetTtlMinutes") {
    return normalizeBoundedInt(value, 5, 1440);
  }
  if (key === "setup.completed") {
    return normalizeBoolean(value);
  }
  // existing branches...
}
```

```ts
// core/server/routes/settingsRoutes.ts (compat alias)
const SETTING_ALIAS: Record<string, SettingKey> = {
  "site.baseUrl": "site.publicBaseUrl",
};

const resolveSettingKey = (raw: string): SettingKey =>
  (SETTING_ALIAS[raw] ?? raw) as SettingKey;
```

---

## Physical Files

| File | Action | Notes |
| --- | --- | --- |
| `core/services/settings/settingsService.ts` | update | defaults + validation + list/get/set handling |
| `core/server/routes/settingsRoutes.ts` | update | alias map for `site.baseUrl` |
| `tests/unit/settings/settingsService.test.ts` | update | bounded int/url/bool validation cases |
| `tests/integration/routes/settings.test.ts` | update | alias write/read coverage |

---

## Acceptance Criteria

- `PATCH /settings` przyjmuje canonical keys i alias `site.baseUrl`.
- Nie da sie zapisac TTL poza dozwolonym zakresem.
- `GET /settings` zwraca spojnosc dla runtime/auth keys.
- Walidacja zwraca `settings_value_invalid` dla zlych wartosci.

---

## Testing Requirements

- Unit:
  - accepts valid URL/null dla `site.publicBaseUrl`
  - rejects invalid URL scheme
  - rejects `auth.sessionTtlDays` poza zakresem
  - rejects `auth.resetTtlMinutes` poza zakresem
- Integration:
  - alias `site.baseUrl` mapuje na `site.publicBaseUrl`

---

## Documentation Updates Required

- `_docs/CMS_API.md` (settings key matrix + alias note)
- `_docs/SECURITY_SPEC.md` (TTL bounds i policy)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-100-01-settings-keys-runtime-validation.md`
