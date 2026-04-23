# 730 - TASK-202 engine admin QA recovery

Date: 2026-04-23
Version: unreleased
Tasks: TASK-202, TASK-202-01, TASK-202-01-01, TASK-202-01-02, TASK-202-01-03, TASK-202-02, TASK-202-02-01, TASK-202-02-02, TASK-202-02-03, TASK-202-03, TASK-202-03-01, TASK-202-03-02, TASK-202-03-03, TASK-202-04, TASK-202-04-01, TASK-202-04-02, TASK-202-04-03, TASK-202-04-04, TASK-202-05, TASK-202-05-01, TASK-202-05-02, TASK-202-05-03

## Key Changes

### Engine list and lifecycle

- Added content type search, sort, real status filtering, duplicate-name badges,
  and row action entry points for edit, duplicate, and delete.
- Added create-to-editor flow with duplicate name/slug validation and shared
  admin feedback.
- Added schema-only content type duplication that creates unique draft copies.

### Safety and status

- Added a real content type `draft` / `published` status column with migration
  artifacts.
- Added guarded content type delete mapping for entries, custom screens,
  taxonomies, content routes, and listings.
- Added editor/list delete confirmations plus local field-remove confirmation
  and undo before save.

### Schema authoring

- Added label-to-key autogeneration with manual lock.
- Added readable fallback labels for legacy machine-readable field titles.
- Replaced comma-separated select configuration with label/value option rows,
  reorder controls, and multi-select schema mapping.
- Added number min/max/integer/decimal/step controls and JSON Schema mapping.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `vitest run --config vitest.config.ts` for TASK-202 admin/UI suites
- `bun test tests/integration/routes/contentTypes.test.ts tests/unit/content/typeService.test.ts tests/unit/content/validation.test.ts tests/unit/assistant/actionExecutorService.test.ts`
- `bun test tests/unit/kits/installService.test.ts tests/unit/kits/schema.test.ts`

DB-backed cases were skipped by the local test harness because the configured
database was not reachable in this session.
