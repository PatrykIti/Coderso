# TASK-039: API Keys Core and UI
# FileName: TASK-039_API_Keys_Core_and_UI.md

**Priority:** Medium  
**Category:** Settings/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001, TASK-004, TASK-006-14, TASK-020  
**Status:** Done (2026-01-31)

---

## Overview

Add storage + API for admin API keys and wire the Settings UI.

## Goals

- Create/revoke/rotate API keys with scopes.
- Store hashed keys (never plaintext).
- Provide list view with last used.

## Sub-Tasks (detailed task files)

- `TASK-039-01_API_Keys_DB_and_Service.md`
- `TASK-039-02_API_Keys_API_Routes.md`
- `TASK-039-03_API_Keys_UI_Wiring.md`

## Documentation Updates Required

- `_docs/CMS_API.md` (api keys endpoints)
- `_docs/SECURITY_SPEC.md` (key hashing + scopes)

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-api-keys-core.md`
