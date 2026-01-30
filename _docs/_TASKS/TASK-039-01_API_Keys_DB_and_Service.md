# TASK-039-01: API Keys DB and Service
# FileName: TASK-039-01_API_Keys_DB_and_Service.md

**Priority:** Medium  
**Category:** Settings/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do

---

## Overview

Persist API keys and implement key management service.

## Schema Design

Add table `api_keys`:
- `id`, `name`, `scopes[]`, `key_hash`, `prefix`, `created_at`, `last_used_at`, `revoked_at`

## Service API

Create `core/services/security/apiKeysService.ts`:
- `listApiKeys()`
- `createApiKey({ name, scopes })` → returns plaintext once
- `revokeApiKey(id)`
- `rotateApiKey(id)` → new plaintext
- `recordApiKeyUsage(prefix)`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | `api_keys` table |
| `core/services/security/apiKeysService.ts` | CRUD + hashing |
| `core/services/security/apiKeyAuth.ts` | verify bearer token |
| `tests/unit/security/apiKeysService.test.ts` | create/rotate/revoke |

## Notes

- Use prefix (first 6 chars) to avoid full lookups.
- Hash using same password hasher (argon2).

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` (API key hashing).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-api-keys-service.md`
