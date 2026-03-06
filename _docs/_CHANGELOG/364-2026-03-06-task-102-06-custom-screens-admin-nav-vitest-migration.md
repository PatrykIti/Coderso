# 364 - TASK-102-06 custom screens and admin nav vitest migration

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-102-06

## Key Changes

### Runner ownership
- Moved Bun-free custom screen UI/admin/schema suites from legacy `tests/unit|integration` locations into `tests/vitest/*`.
- Kept DB-backed custom screen service coverage and route registration coverage in Bun-owned suites.
- Removed duplicate Bun-free legacy suites after targeted parity validation.

### Vitest lane
- Added Vitest coverage ownership for `core/admin/services/customScreensClient.ts` and `core/services/customScreens/**/*.ts`.
- Added new Vitest suites for:
  - custom screen schemas,
  - custom screen binding panel,
  - custom screen pages/records workflow,
  - Coderso modules and admin sidebar shortcuts.

### Validation
- Ran `bun --cwd core lint`
- Ran `bun --cwd core lint:types`
- Ran `bun run test:vitest`
- Ran Bun-owned custom screen route and DB-backed service tests
