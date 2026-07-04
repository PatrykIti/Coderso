# 1186 - TASK-468 V4 Definition Slice

Date: 2026-06-20
Version: Unreleased
Tasks: TASK-468, TASK-468-01, TASK-468-02, TASK-468-04, TASK-468-05, TASK-468-05-L03

## Key Changes

- Started TASK-468 and recorded drift corrections: the records list remains the
  existing table, `custom_screens.content_type_id` stays canonical, and entry
  detail editing persists to entry fields instead of screen definitions.
- Added `schemaVersion: 4` Custom Screen definitions with `ScreenDocumentV1`
  and `ScreenFieldBinding`, plus V1/V2/V3 read migration into V4.
- Kept legacy `custom_screens.blocks` and `custom_screens.bindings` as
  compatibility projections until the later backfill/drop phase.
- Updated Custom Screen service/client/capabilities and assistant preview reads
  to use V4 helper projections.
- Removed the widget edit button from the entry canvas so record detail mode is
  field-editing-only, not a section/block builder.
- Superseded TASK-468-05-L03 because card/compact list presentation modes are
  out of scope.

## Validation

- `bun run test:vitest -- tests/vitest/admin/custom-screen-schemas.test.ts`
- `bun run test:vitest -- tests/vitest/customScreens/customScreenService.test.ts`
- `bun run test:vitest -- tests/vitest/customScreens/capabilities.test.ts`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `bun run test:vitest -- tests/vitest/customScreens tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/admin/customScreensClient.test.ts tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
- Live smoke: `coderso-dev-core-host` + `playwright-cli -s=task468-v4-smoke`
  loaded `http://coderso-a.localhost:5173/admin/advanced/custom-screens`
  authenticated from `.env`, with no console warnings/errors. Existing data did
  not include a record detail to smoke.
