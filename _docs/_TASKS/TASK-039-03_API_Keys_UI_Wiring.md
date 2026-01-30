# TASK-039-03: API Keys UI Wiring
# FileName: TASK-039-03_API_Keys_UI_Wiring.md

**Priority:** Medium  
**Category:** Settings/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-039-02, TASK-006-14  
**Status:** To Do

---

## Overview

Wire the API Keys settings screen to live API data.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/apiKeysClient.ts` | list/create/rotate/revoke |
| `core/admin/ui/settings/ApiKeysPage.tsx` | replace mock data |
| `core/admin/ui/settings/ApiKeysTable.tsx` | bind row actions |
| `tests/integration/ui/apiKeys.test.tsx` | UI renders + actions |

## Notes

- Show plaintext key only once (modal).
- Surface revoke/rotate errors.

## Documentation Updates Required

- `_docs/CMS_API.md` (UI wiring note).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-api-keys-ui.md`
