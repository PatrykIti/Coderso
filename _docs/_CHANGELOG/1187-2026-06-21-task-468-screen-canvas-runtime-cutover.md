# 1187 - TASK-468 Screen Canvas Runtime Cutover

Date: 2026-06-21
Version: Unreleased
Tasks: TASK-468, TASK-468-04, TASK-468-04-L01, TASK-468-04-L02,
TASK-468-04-L03, TASK-468-04-L04, TASK-468-04-L05, TASK-468-05,
TASK-468-05-L01, TASK-468-05-L02, TASK-468-05-L04, TASK-468-05-L05

## Key Changes

- Replaced active Custom Screen Editor View authoring with native
  `ScreenDocumentV1` blocks, a screen block library, screen runtime canvas, and
  screen block inspector.
- Removed active Editor View dependencies on Page/widget builder components:
  `WidgetPicker`, `BlockList`, `BlockSettings`, `FieldBindingPanel`, page block
  utils, and widget registry contracts.
- Added `screenDocumentOps` helpers for screen-native add, move, duplicate,
  delete, nested slot insertion, binding duplication, and binding cleanup.
- Replaced Custom Screen preview and entry-detail rendering with
  `ScreenRuntimeRenderer` over V4 documents and `ScreenFieldBinding` records.
- Connected writable V4 bindings to the existing content entry field controls
  and payload builders; legacy placeholders are readable only and cannot make a
  screen editor-ready.
- Kept the records list table workflow unchanged.

## Validation

- `bun run test:vitest -- tests/vitest/customScreens/screenDocumentOps.test.ts tests/vitest/customScreens/capabilities.test.ts tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx tests/vitest/widgets/screenWidgets.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/admin/customScreensClient.test.ts tests/vitest/customScreens/customScreenService.test.ts tests/vitest/customScreens/capabilities.test.ts tests/vitest/customScreens/screenDocumentOps.test.ts tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screen-list-view.test.ts tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screen-preview-data.test.ts tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx tests/vitest/widgets/screenWidgets.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun run gates:coderso`

## Follow-Up Scope

- TASK-468 remains open for TASK-468-01/02/03/06/07: external drift contract
  closure, neutral authoring extraction follow-up, assistant V4 action schemas,
  backfill verification, retained legacy bridge removal, and legacy DB column
  cleanup.
