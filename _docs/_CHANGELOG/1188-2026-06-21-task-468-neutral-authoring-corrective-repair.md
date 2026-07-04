# 1188 - TASK-468 Neutral Authoring Corrective Repair

Date: 2026-06-21
Version: Unreleased
Tasks: TASK-468, TASK-468-03, TASK-468-03-L01, TASK-468-03-L02,
TASK-468-03-L03, TASK-468-03-L04, TASK-468-04, TASK-468-04-L02,
TASK-468-04-L05, TASK-468-05, TASK-468-05-L05, TASK-473

## Key Changes

- Added `core/admin/ui/authoring/*` as UI-only authoring primitives for canvas
  viewport, selection, insertion zones, layers, command palette, and floating
  toolbar/panels.
- Reworked Custom Screen Editor View to use `ScreenAuthoringCanvas` over the
  neutral shell. Insert, layers, content, binding, style, and settings now live
  in floating canvas panels instead of fixed Editor View rails.
- Corrected `ScreenDocumentV1` so `sections[]` contains `ScreenSectionV1`
  containers with nested `blocks[]`; flat V4 block-array documents are repaired
  on read into the default section and strict writes save the sectioned shape.
- Reworked Custom Screen record entry detail to use the same neutral canvas
  shell with a floating Value panel. Record mode does not expose builder add,
  move, duplicate, delete, library, settings, or right-Sheet controls.
- Added TASK-473 as the explicit follow-up for durable per-record presentation
  overrides outside validated `content_entries.data`.

## Validation

- `bun run test:vitest -- tests/vitest/ui/authoring-canvas.test.tsx tests/vitest/ui/custom-screen-authoring-boundary.test.ts tests/vitest/customScreens/screenDocumentOps.test.ts tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/customScreens/customScreenService.test.ts tests/vitest/customScreens/capabilities.test.ts tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx tests/vitest/widgets/screenWidgets.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Follow-Up Scope

- TASK-473 owns any persistent per-record image/text-size/style override
  storage/API work.
- TASK-468 remains open for assistant V4 actions, backfill verification, legacy
  bridge removal, duplicate storage cleanup, and final family closure.
