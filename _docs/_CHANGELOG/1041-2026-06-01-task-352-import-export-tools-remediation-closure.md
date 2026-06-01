# 1041 - TASK-352 Import Export tools remediation closure

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-352, TASK-352-01, TASK-352-02, TASK-352-03, TASK-352-04, TASK-352-05

## Key Changes

### Import / Export

- Replaced misleading Content Types/Pages/Media export cards with the supported
  v1 configuration surfaces: Site Settings, Navigation Menus, Theme
  Configuration, and Redirect Rules.
- Added controlled export target/include options from UI to client to
  `GET /tools/export`, with strict route validation and service normalization.
- Added bundle `scope` metadata so targeted exports can be imported without
  treating omitted sections as deletion instructions.
- Added real redirect import/export DTOs using `fromPath`, `toPath`,
  `statusCode`, and `enabled`.
- Added UUID-backed import validation for persisted IDs and references,
  duplicate route/redirect path checks, admin theme template reference checks,
  and centralized `mapImportExportError` mappings.
- Replaced static Recent Imports fixtures with session-local activity rows,
  controlled search, real preview/apply progress, failure reasons, and an
  `Upload again` action.
- Aligned import copy, file input accept list, parser behavior, and client
  rejection to JSON-only bundles until CSV/ZIP contracts exist.
- Documented Import / Export as intentionally uncached because bundles may
  contain controlled configuration data and activity rows are session-local.

## Validation

- `bun test tests/unit/tools/importExport.test.ts`
- `bun test tests/integration/routes/importExport.test.ts`
- `bun run test:vitest -- tests/vitest/admin/importExportClient.test.ts tests/vitest/ui/import-export.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Focused headless Chromium CDP proof for `/admin/tools/import-export`:
  target/include export shape, disabled unavailable controls, invalid JSON
  rejection, malformed UUID rejection, valid JSON preview/apply/restore,
  session-local activity search/progress, and zero unexpected browser
  page/network loading errors. The expected malformed-bundle 400 was observed
  and excluded from unexpected-error counts. Temporary fixtures were removed
  after the pass.
