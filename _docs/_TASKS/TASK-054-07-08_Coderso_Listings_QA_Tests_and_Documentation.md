# TASK-054-07-08: Coderso Listings QA, Tests, and Documentation
# FileName: TASK-054-07-08_Coderso_Listings_QA_Tests_and_Documentation.md

**Priority:** High  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-07-01..07  
**Status:** Done (2026-02-18)

---

## Goal
Finalize quality gates and documentation for Listings suite with complete regression coverage.

## Files to Change
- `tests/unit/content/*listing*`
- `tests/unit/widgets/contentList.test.tsx`
- `tests/unit/widgets/entryTeaser.test.tsx`
- `tests/integration/routes/listings.test.ts`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_CHANGELOG/*.md`

## QA Matrix
- Query validation errors (operator/field/limit/source mismatch).
- Execution limits and deterministic sorting.
- Template CRUD + invalid config handling.
- UI loading/empty/error states.
- Runtime backward compatibility for legacy widgets.

## Acceptance Criteria
1. Unit + integration tests pass with deterministic coverage.
2. Docs explain query/template/runtime contracts in user-friendly language.
3. Changelog includes task IDs and migration notes.

## Result
- Domkniete testy regresji dla back-compat runtime:
  - `content-list`: brak `source.mode` + `listingQueryId` => listing mode.
  - `entry-teaser`: brak `source.mode` + `listingQueryId` => listing mode.
- Zweryfikowane pelne quality gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`
- Uzupelniona dokumentacja:
  - `_docs/CMS_API.md`: nowa sekcja `Coderso Listings (v1 beta)` z endpointami, payloadami, operatorami, error codes i runtime contract.
  - `_docs/ARCHITECTURE.md`: sekcja `Coderso Listings engine (v1 beta)` z kontraktem warstw i security/runtime rules.
  - `_docs/CODERSO_MODULES.md`: aktualizacja progresu 054-07 i kolejnego milestone.
