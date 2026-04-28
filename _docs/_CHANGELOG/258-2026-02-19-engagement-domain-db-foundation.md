# 258 - Engagement Domain DB Foundation

- **Date:** 2026-02-19
- **Version:** 0.1.258
- **Tasks:** TASK-054-12, TASK-054-12-01

## Key Changes

### Mega Menu Metadata
- Extended `menu_items` with structured metadata container:
  - `settings` JSONB field for badge/visibility/icon/description configuration.
- File:
  - `core/db/schema.ts`

### Popups Domain Tables
- Added `popups` table with lifecycle and builder payload fields:
  - `status`, `trigger`, `targeting`, `frequency`, `content`, `settings`,
  - `publishedAt`, `createdAt`, `updatedAt`,
  - unique slug and status/update indexes.
- File:
  - `core/db/schema.ts`

### Reviews Domain Tables
- Added `reviews` table with moderation lifecycle fields:
  - `entityType`, `entityId`, `status`, `rating`, content/author fields,
  - `moderatedBy`, `moderatedAt`, `publishedAt`,
  - entity/status indexes.
- File:
  - `core/db/schema.ts`

### Migration and Tests
- Generated migration artifacts:
  - `core/db/migrations/0043_parched_omega_sentinel.sql`
  - `core/db/migrations/meta/0043_snapshot.json`
  - `core/db/migrations/meta/_journal.json`
- Added DB-backed schema tests:
  - `tests/unit/engagement/schema.test.ts`
