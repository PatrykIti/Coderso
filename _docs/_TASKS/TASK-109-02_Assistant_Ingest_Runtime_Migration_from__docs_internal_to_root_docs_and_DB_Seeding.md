# TASK-109-02: Assistant Ingest Runtime Migration from _docs/_internal to root docs and DB Seeding
# FileName: TASK-109-02_Assistant_Ingest_Runtime_Migration_from__docs_internal_to_root_docs_and_DB_Seeding.md

**Priority:** High  
**Category:** Core/Assistant + Core/DB + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-109-01  
**Status:** Done (2026-03-20)

---

## Overview

Przeniesc source-of-truth assistant knowledge base z `_docs/_internal` do `docs/` i dopasowac ingest/runtime/DB seeding do nowego korpusu.

To jest task kontraktowo-infrastrukturalny, nie tylko "napisanie markdownow".

---

## Security Contract

- Visibility: `internal`
- Affected endpoints:
  - `GET /admin/api/assistant/status`
  - `POST /admin/api/assistant/reindex`
- Auth model:
  - admin session
  - `settings:read` dla `status`
  - `settings:write` dla `reindex`
- CSRF:
  - wymagane dla `POST /assistant/reindex`
- Rate-limit bucket:
  - bez oslabiania istniejacego assistant/runtime contract
- Validation:
  - strict reject-unknown dla istniejacych payloadow pozostaje bez zmian
- Anti-abuse:
  - brak nowych public endpoints
  - brak nowych write surfaces poza istniejacym internal reindex flow

---

## Scope

1. Zmienic source root assistant docs z `_docs/_internal` na `docs/`.
2. Dostosowac kontrakt ingest:
   - scan root,
   - frontmatter,
   - required sections,
   - path normalization.
3. Seed do DB jest wymaganym warunkiem gotowosci official assistant corpus.
4. Usunac fallback runtime do filesystem corpus dla official `docs/`.
5. Zmienic runtime status semantics:
   - brak seeded DB corpus = assistant docs `not ready`,
   - brak odpowiedzi z filesystem jako planu awaryjnego dla official docs.
6. Zaktualizowac docs/runtime/settings copy.

---

## Sub-Tasks

1. Zmienic ingest source contract i default settings/source root.
2. Wymusic DB-seeded readiness jako jedyna sciezke official corpus availability.
3. Usunac filesystem fallback z assistant runtime dla official docs.
4. Dolozyc testy ingest/runtime dla root `docs/`.

---

## Files

- `core/services/assistant/docsIngestService.ts`
- `core/services/assistant/assistantService.ts`
- `core/services/settings/settingsService.ts`
- `tests/vitest/assistant/docsIngestService.test.ts`
- `tests/unit/assistant/assistantService.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SETTINGS.md`

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted assistant ingest/runtime suites
- explicit coverage that missing DB-seeded official corpus returns `not ready` rather than filesystem fallback

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SETTINGS.md`
- `_docs/ASSISTANT_GUIDE.md`

---

## Completion Notes (2026-03-20)

- Switched assistant DB ingest defaults from `_docs/_internal` to root `docs/`.
- Updated assistant runtime defaults to the DB-backed corpus path.
- Removed official DB-to-filesystem fallback semantics and aligned runtime readiness around seeded DB corpus.
- Updated assistant ingest/runtime tests to reflect the new contract.
