# 724. TASK-197 pages builder library scroll containment

Date: 2026-04-23
Version: unreleased
Tasks: TASK-197

## Key Changes

### CMS Pages / Admin UI

- Repaired the Pages editor left builder rail so `Widgets`, `Templates`, and
  `Forms` scroll inside their own active list viewport instead of landing on an
  outer wrapper that shows a scrollbar without moving the list.
- Constrained the existing `LibraryPanel -> WidgetPicker / TemplatePicker /
  FormPicker` stack with `min-h-0`, `overflow-hidden`, and fixed header/tab
  regions so the searchable list owns scrolling predictably.
- Kept mobile parity by applying the same bounded-scroll contract to the Pages
  builder sheet.

### QA

- Added Vitest layout-contract coverage for the picker roots and the rendered
  Pages editor shell so this regression is caught before another CSS-only
  refactor ships.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/ui/page-editor.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-editor-shell-wave.test.tsx`
