# TASK-039-02: API Keys API Routes
# FileName: TASK-039-02_API_Keys_API_Routes.md

**Priority:** Medium  
**Category:** Settings/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-039-01, TASK-004-06  
**Status:** To Do

---

## Overview

Expose admin endpoints for API key management.

## Endpoints

- `GET /api/settings/api-keys`
- `POST /api/settings/api-keys`
- `POST /api/settings/api-keys/:id/rotate`
- `POST /api/settings/api-keys/:id/revoke`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/routes/apiKeysRoutes.ts` | routes + guards |
| `core/server/routes/index.ts` | register |
| `tests/integration/routes/apiKeys.test.ts` | wiring |

## Notes

- Require `settings:write` permission.
- Return plaintext key only once on create/rotate.

## Documentation Updates Required

- `_docs/CMS_API.md` (api keys routes).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-api-keys-api.md`
