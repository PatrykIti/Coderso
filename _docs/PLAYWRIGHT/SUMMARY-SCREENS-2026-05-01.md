# Raport UX/QA — Custom Screens Workspace Builder V2

**Data:** 2026-05-01
**Zakres:** TASK-248 closure
**Srodowisko lokalne:** worktree `Nextless-task-248`
**Playwright CLI replay:** nieuruchomiony lokalnie

---

## Status replay

House Projects replay wymagany przez `TASK-248-04-02` nie zostal uruchomiony w
tym worktree, poniewaz lokalnie nie bylo gotowego authenticated dev server /
sesji admina oraz `.env` / `DATABASE_URL`. Nie zapisano screenshotow ani trace.

Zamiast tego closure opiera sie na targeted code/test proof dla kontraktow,
ktore replay mial sprawdzic:

- V2 definition schema, V1 migration, list/editor defaults.
- Workspace route helpers and prefetch target resolution.
- `List View` records table rendering from `definition.listView`.
- `Editor View` create/edit draft helpers and non-destructive update payloads.
- Existing content-entry routes reused for create/update/delete, with
  centralized machine-readable error mapping.
- Admin widget surface split for `admin-list-view` and `admin-editor-view`.

## Walidacja wykonana

- `bun --cwd core lint:types` — passed.
- `bun --cwd core lint` — passed.
- `bun run test:vitest -- tests/vitest/customScreens/customScreenService.test.ts tests/vitest/customScreens/capabilities.test.ts tests/vitest/admin/customScreensClient.test.ts tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/admin/entriesClient.test.ts tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screen-route-params.test.ts` — passed.
- `bun test tests/integration/routes/customScreensRoutes.test.ts tests/integration/routes/contentEntriesRoutes.test.ts tests/unit/widgets/registry.test.ts` — passed.
- `bun run gates:coderso` — passed; DB-backed gate subchecks were skipped
  because `DATABASE_URL` is not configured.

## Niewykonane lokalnie

- DB-backed migration smoke dla `custom_screens.definition`: `.env` file missing
  and `DATABASE_URL` unset.
- Playwright CLI House Projects replay: no authenticated dev server/session was
  available in this worktree.

## Follow-up do manualnego replay

Po uruchomieniu dev servera z authenticated admin session:

1. Stworz content type House Projects z wymaganym polem status/select.
2. Stworz Custom Screen dla House Projects.
3. Skonfiguruj `List View` columns/filter.
4. Skonfiguruj `Editor View` fields.
5. Utworz rekord przez `/advanced/custom-screens/:screenId/entries/new`.
6. Edytuj rekord przez `/advanced/custom-screens/:screenId/entries/:entryId`.
7. Sprawdz network:
   - valid create/update nie zwraca `entry_validation_failed`,
   - invalid required data zwraca HTTP 400 `entry_validation_failed`,
   - duplicate slug zwraca HTTP 409 `entry_slug_conflict`,
   - brak nieoczekiwanych 500.
