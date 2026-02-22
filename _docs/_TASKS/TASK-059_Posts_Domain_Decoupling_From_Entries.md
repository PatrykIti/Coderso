# TASK-059: Posts Domain Decoupling From Entries
# FileName: TASK-059_Posts_Domain_Decoupling_From_Entries.md

**Priority:** High  
**Category:** Architecture/Data Model  
**Estimated Effort:** Large  
**Dependencies:** TASK-055, TASK-057  
**Status:** In Progress (2026-02-22)

---

## Overview
Przebudowac modul Posts tak, aby byl niezaleznym bytem CMS (WordPress-like core), bez trzymania rekordow postow w `content_entries` i bez zaleznosci runtime/API od `Entries`.

## Goals
1. Posts ma osobny model danych i osobne tabele.
2. Posts ma osobny serwis domenowy i API.
3. Editor/lista/routing posts nie korzysta z `EntryEditor` ani `content type: post`.
4. Runtime/listings/search pobieraja posts z dedykowanego zrodla.
5. Migracja danych jest idempotentna i bezpieczna (backfill + cutover).

## Scope
1. Nowy DB schema dla posts (+ revisions + preview tokens + metadata relacje).
2. Serwis domenowy posts bez odwolan do `entries/content-types`.
3. Internal API `/admin/api/posts*` podpiete do nowego serwisu.
4. Admin UI posts (list/editor) przepiete na nowy kontrakt.
5. Runtime i listing/search source `posts` przepiete na nowe tabele.
6. Dedykowany widget do osadzania posts na stronach (bez wymagania custom query buildera przez usera).
7. Migracja danych z obecnego modelu opartego o `entries`.
8. QA, testy, dokumentacja i changelog closure.

## Out of Scope
1. Zmiana UX edytora blokowego (to zostaje zgodne z TASK-057).
2. Rozszerzenia funkcjonalne posts niezwiązane z decouplingiem (np. nowe bloki, nowe SEO features).
3. Finalne usuniecie starych tabel `entries` (dotyczy tylko odciecia posts od entries).

## Sub-Tasks
- `TASK-059-01`: Posts DB Schema and Migration Foundation
- `TASK-059-02`: Posts Domain Service Extraction
- `TASK-059-03`: Posts Admin API Decoupling
- `TASK-059-04`: Posts Admin UI Refactor (No Entries Dependency)
- `TASK-059-05`: Posts Runtime, Listings, and Search Source Cutover
- `TASK-059-06`: Data Backfill, Cutover Strategy, and Rollback
- `TASK-059-07`: Posts Embed Widget and Page Builder Integration
- `TASK-059-08`: QA, Docs, Changelog, and Closure

## Implementation Order
1. `059-01` + `059-06` (schema + migration plan).
2. `059-02` + `059-03` (domain + API contract).
3. `059-04` + `059-05` (UI/runtime cutover).
4. `059-07` (widget + page builder exposure).
5. `059-08` (full regression + docs/changelog/kanban close).

## Acceptance Criteria
1. Posts CRUD/revisions/preview/publish dziala bez `content_entries`.
2. W kodzie runtime/API nie ma required dependency `post -> entries`.
3. Listing/search source `posts` czyta z nowej tabeli.
4. Migracja jest idempotentna i ma rollback plan.
5. Pelny zestaw testow przechodzi.

## Testing Requirements
- Unit:
  - schema normalization/validation,
  - service lifecycle,
  - migration mapping helpers.
- Integration:
  - admin API posts,
  - runtime rendering posts,
  - listing/search source posts.
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test` (full)

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/ADMIN_CACHE.md` (jesli zmienia sie cache keys/clients)
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Progress Notes
- 2026-02-22:
  - `TASK-059-01` completed (dedicated posts DB schema + migration 0045 + schema contract tests).
  - `TASK-059-02` completed (posts domain service extracted from entries/content-types; CRUD/revisions/autosave now backed by `posts*` tables).
  - `TASK-059-03` completed (admin `/posts*` routes validated as post-native API contract with dedicated error mapping and RBAC route tests).
  - `TASK-059-04` completed (posts editor UI no longer depends on `EntryEditor mode=\"posts\"`; dedicated classic shell + entries-only EntryEditor cleanup).
  - `TASK-059-05` completed (runtime/listings/search source `posts` cut over to dedicated posts storage; public site + listing route meta + public search aligned).
