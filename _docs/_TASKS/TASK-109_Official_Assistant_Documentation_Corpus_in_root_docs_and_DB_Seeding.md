# TASK-109: Official Assistant Documentation Corpus in root docs and DB Seeding
# FileName: TASK-109_Official_Assistant_Documentation_Corpus_in_root_docs_and_DB_Seeding.md

**Priority:** High  
**Category:** Docs + Assistant + Core/DB  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-08, TASK-107  
**Status:** Done (2026-03-20)

---

## Overview

Utworzyc oficjalny corpus dokumentacji dla asystenta w katalogu `docs/` w root repo, zamiast opierac knowledge base na `_docs/_internal`.

Cel:
- assistant ma korzystac z oficjalnej, produktowej dokumentacji, a nie z technicznych notatek `_docs`,
- dokumentacja ma byc seedowana do bazy danych przez istniejacy pipeline ingest,
- corpus ma opisywac mozliwosci kazdego ekranu, typowe workflow, oraz przyklady zastosowan dla `Solution Kits` i scenariuszy poza kitami,
- `docs/` staje sie source-of-truth dla user-facing assistant docs, a `_docs/` pozostaje repozytorium architektury, taskow, changelogu i dokumentacji developerskiej.

---

## Product / Information Architecture Contract

1. `docs/` w root repo jest oficjalnym korpusem dokumentacji uzywanej przez asystenta.
2. `_docs/` nie jest juz primary source dla assistant KB.
3. Dokumentacja w `docs/` ma byc:
   - produktowa,
   - explainable,
   - krok-po-kroku,
   - napisana pod usera/admina,
   - bogata w examples / when-to-use / common pitfalls.
4. Kazdy istotny ekran admina ma miec swoj opis:
   - po co sluzy,
   - wszystkie mozliwosci,
   - typowe workflow,
   - zaleznosci od innych ekranow/modulow.
5. `Solution Kits` i scenariusze poza kitami maja miec osobne playbooki/przyklady zastosowan.
6. Ingest do DB ma korzystac z `docs/` jako source root i zachowac walidacje kontraktu dokumentow.
7. Official assistant corpus jest uznawany za gotowy dopiero po seedzie do DB.
8. Runtime assistant nie moze fallbackowac do filesystem corpus, gdy official `docs/` nie zostal zseedowany do DB.

---

## Sub-Tasks

1. `TASK-109-01` - root `docs/` information architecture, authoring contract, and coverage matrix.
2. `TASK-109-02` - assistant ingest/runtime migration from `_docs/_internal` to `docs/` and DB seeding contract.
3. `TASK-109-03` - official documentation corpus for core admin screens and settings surfaces.
4. `TASK-109-04` - official documentation corpus for Coderso modules and screen workflows.
5. `TASK-109-05` - Solution Kits, applied examples, and non-kit playbooks corpus.
6. `TASK-109-06` - QA, docs index, changelog, and closure.

---

## Files to Change

- `docs/` (new root documentation tree)
- `docs/README.md` (new)
- `docs/_TEMPLATE.md` or equivalent authoring template (new)
- `core/services/assistant/docsIngestService.ts`
- `core/services/assistant/assistantService.ts`
- `core/services/settings/settingsService.ts`
- `core/admin/ui/settings/AssistantSettingsPage.tsx` (if source root / copy changes)
- `tests/vitest/assistant/docsIngestService.test.ts`
- `tests/unit/assistant/assistantService.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SETTINGS.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`

---

## Acceptance Criteria

1. Assistant DB ingest can be seeded from `docs/` in root repo and is the required path for official assistant docs readiness.
2. The official assistant knowledge corpus no longer depends on `_docs/_internal` as the primary source.
3. Runtime assistant does not use filesystem fallback for the official `docs/` corpus.
4. Every major admin screen family has official documentation covering purpose, capabilities, workflows, and examples.
5. Solution Kits have applied documentation with concrete scenarios and reusable examples.
6. The corpus is structured enough that future docs additions can follow a repeatable standard instead of ad-hoc markdown.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted assistant ingest/runtime suites
- targeted docs corpus validation checks introduced by the implementation

---

## Documentation Updates Required

- `docs/README.md`
- `docs/*`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SETTINGS.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` (on completion)

---

## Completion Notes (2026-03-20)

- Added an official English assistant corpus under root `docs/`.
- Added authoring/template/coverage artifacts for the new corpus.
- Moved official assistant source-of-truth from `_docs/_internal` to `docs/`.
- Updated assistant ingest/runtime defaults to use the DB-seeded `docs/` corpus and removed official runtime fallback from DB to filesystem.
- Synced architecture/API/settings/security docs to the new corpus contract.
