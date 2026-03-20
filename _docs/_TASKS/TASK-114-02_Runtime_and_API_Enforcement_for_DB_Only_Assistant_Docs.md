# TASK-114-02: Runtime and API Enforcement for DB-Only Assistant Docs
# FileName: TASK-114-02_Runtime_and_API_Enforcement_for_DB_Only_Assistant_Docs.md

**Priority:** High  
**Category:** Core/Assistant + Core/API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-114-01  
**Status:** To Do

---

## Overview

Utwardzic assistant runtime i API tak, aby official assistant docs mogly dzialac
tylko w modelu `docs -> DB seeded corpus`.

---

## Security Contract

- Visibility: `internal`
- Affected endpoints:
  - `GET /admin/api/assistant/status`
  - `POST /admin/api/assistant/chat`
  - `POST /admin/api/assistant/reindex`
- Auth model:
  - admin session
  - `settings:read` dla `status` i `chat`
  - `settings:write` dla `reindex`
- CSRF:
  - wymagane dla `POST /assistant/reindex`
- Rate-limit bucket:
  - bez oslabiania obecnego contractu assistant endpoints
- Validation:
  - legacy settings/path combinations nie moga dalej aktywowac filesystem official runtime
- Anti-abuse:
  - bez nowych public endpoints

---

## Scope

1. Usunac remaining official runtime fallback semantics do filesystem.
2. Upewnic sie, ze `status` i `chat` zachowuja sie spójnie, gdy DB corpus nie jest gotowy.
3. Upewnic sie, ze `reindex` jednoznacznie seeduje root `docs/` do DB.

---

## Sub-Tasks

1. Wymusic DB-only runtime path dla official corpus.
2. Dolozyc testy `not ready` / `assistant_index_missing` bez fallbacku.
3. Zweryfikowac status/reindex payload expectations.

---

## Files

- `core/services/assistant/assistantService.ts`
- `core/services/assistant/docsIndexService.ts`
- `core/services/assistant/docsIngestService.ts`
- `tests/unit/assistant/assistantService.test.ts`

---

## Testing Requirements

- targeted assistant runtime tests

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
