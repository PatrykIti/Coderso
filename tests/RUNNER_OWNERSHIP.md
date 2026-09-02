# Runner Ownership Matrix

Snapshot date: `2026-08-26`
Repository snapshot: `HEAD 18a45f0687dc0b23baa49f05eada60a874235b09`
Manifest snapshot: `tests/bun-lane-manifest.json` generated `2026-08-22T18:13:50.719Z`

This document is the practical ownership companion to `_docs/TESTING_STRATEGY.md`.
It records the current post-TASK-580 runner boundary and the TASK-105-08-11 split-family
handoff. Counts below are derived from the current filesystem and manifest, not from the
older 2026-03-06 baseline. The migration and split receipts remain subject to their
own validation gates and are not represented here as broadly validated completion.

## Current classification snapshot

- Vitest-owned test files under `tests/vitest/`: `1126` (`.test.ts` / `.test.tsx`).
- Bun-owned test files currently present: `470`, comprising `tests/unit` (`295`),
  `tests/integration` (`155`), `tests/perf` (`6`), and `tests/security` (`14`).
- The current Bun execution manifest contains `437` rows: bucket A (`169`), bucket B
  (`207`), bucket C (`55`), and perf (`6`). The manifest is a scheduling/ownership
  input, not a replacement for filesystem classification.
- The post-TASK-580 boundary remains: widget v1 surfaces and their former editor
  suites are not an owned product surface. Bun is retained for DB, runtime, plugin,
  media, public-write, performance, and security semantics; Bun-free contracts belong
  to Vitest.

## Strong Vitest ownership clusters

- `tests/vitest/ui/*` (admin UI, including menus, users/roles, and booking)
- `tests/vitest/ui-integration/*`
- `tests/vitest/assistant/*`
- `tests/vitest/pages/*`
- `tests/vitest/posts/*`
- `tests/vitest/forms/*`
- `tests/vitest/search/*`
- `tests/vitest/server/*`
- `tests/vitest/validation/*`
- `tests/vitest/sdk/*`

### Split families and downstream handoff

The four TASK-105-08-11 families are represented by the following current files. Each
TEST part is independently runnable; fixture modules are validated through their
importing suites. The named downstream leaves own future extensions to these parts,
not the pre-split monoliths.

- **Menus**, owned downstream by `TASK-105-08-05`:
  - `tests/vitest/ui/menu-design-editor-structure.test.tsx`
  - `tests/vitest/ui/menu-design-editor-canvas.test.tsx`
  - `tests/vitest/ui/menu-design-editor-canvas-units.test.tsx`
  - `tests/vitest/ui/menu-design-editor-revalidation.test.tsx`
  - `tests/vitest/ui/menu-design-editor-brand-nav.test.tsx`
  - `tests/vitest/ui/menu-design-editor-block-fields.test.tsx`
  - `tests/vitest/ui/menu-design-editor-controls.test.tsx`
  - `tests/vitest/ui/menuDesignEditorFixtures.tsx`
  - (`revalidation` was a split part of the 08-11 family; `canvas-units` is a
    later 08-05-stream extension — both are listed here because the runner
    ownership table records the current on-disk menu family.)
- **Users / roles**, owned downstream by `TASK-105-08-09`:
  - `tests/vitest/ui/users-roles-users-invite.test.tsx`
  - `tests/vitest/ui/users-roles-permissions.test.tsx`
  - `tests/vitest/ui/usersRolesFixtures.tsx`
- **Booking**, owned downstream by `TASK-105-08-08`:
  - `tests/vitest/ui/booking-page-wave.test.tsx`
  - `tests/vitest/ui/booking-page-errors.test.tsx`
  - `tests/vitest/ui/booking-page-schedule-crud.test.tsx`
  - `tests/vitest/ui/booking-page-tabs.test.tsx`
  - `tests/vitest/ui/bookingFixtures.resources.tsx`
  - `tests/vitest/ui/bookingFixtures.services.tsx`
  - `tests/vitest/ui/bookingFixtures.schedules.tsx`
  - `tests/vitest/ui/bookingFixtures.submissions.tsx`
- **Assistant blueprints**, owned downstream by `TASK-105-08-07`:
  - `tests/vitest/assistant/blueprint-action-assembler-blocks.test.ts`
  - `tests/vitest/assistant/blueprint-action-assembler-bindings.test.ts`
  - `tests/vitest/assistant/blueprint-action-assembler-sections.test.ts`
  - `tests/vitest/assistant/blueprintActionAssemblerFixtures.ts`

## Child-08 schema-validator handoff

`tests/unit/server/schemaValidator.test.ts` is no longer a retained Bun suite. Its eight
behavior groups are handed to `TASK-105-11-03-08`, with exactly these destination writers:

- extend `tests/vitest/validation/postSchemas.test.ts`;
- create `tests/vitest/validation/contentSchemas.test.ts`;
- create `tests/vitest/validation/assistantActionSchemas.test.ts`;
- delete the legacy `tests/unit/server/schemaValidator.test.ts` only after destination
  coverage is verified.

The generic `tests/vitest/validation/schemaValidator.test.ts` remains read-only. This
runner document records the handoff only. It does not claim that child 08's migration
has been validated or closed.

### Validated receipt (2026-09-02)

`TASK-105-11-03-08` completed the transfer recorded above: the legacy
`tests/unit/server/schemaValidator.test.ts` is deleted, the eight behavior groups landed
in `postSchemas.test.ts`, `contentSchemas.test.ts`, and `assistantActionSchemas.test.ts`,
and the generic `schemaValidator.test.ts` suite is retained read-only. Validated green:
4 test files / 14 tests / 0 failures (Vitest `4.1.10`). Recorded by `TASK-105-08-11` as
consuming owner; `TASK-105-11-04` still owns the README/closure follow-through. The
snapshot counts above stay dated `2026-08-26` and are unchanged.

## Strong Bun ownership clusters

- DB-backed service tests
- plugin lifecycle tests
- `tests/integration/routes/*`
- `tests/integration/runtime/*`
- `tests/integration/server/*`
- `tests/integration/store/*`
- `tests/perf/*`
- `tests/security/*`

### Four retained Bun server suites

These are the exact four retained server suites from the post-TASK-580 ownership freeze:

| Suite | Required lane | Ownership reason |
|---|---|---|
| `tests/unit/server/adminAssetsRouting.test.ts` | Bun | Exercises the runtime/admin asset boundary through `core/server/httpServer`; it is not a Bun-free pure helper contract. |
| `tests/unit/server/publicBookingApi.test.ts` | Bun | Uses the database and public-write security controls, including nonce/API-key behavior, so its contract is DB/security-bound. |
| `tests/unit/server/publicFormsApi.test.ts` | Bun | Combines injected seams with database-backed public and internal write behavior, so it remains a mixed runtime/DB integration contract. |
| `tests/unit/server/publicFormsUploadApi.test.ts` | Bun | Exercises database, media, and public/internal write boundaries and therefore remains a runtime-backed contract. |

The schema-validator transfer above is not a fifth retained Bun case. No other server
suite is silently classified by directory convention in this handoff.

## Operational boundary

- If a suite does not require Bun runtime, it belongs in Vitest rather than remaining in
  Bun solely to preserve old structure.
- If a suite requires DB, runtime, plugin lifecycle, media, or public-write security
  behavior, keep it in Bun even when a pure helper slice is migrated.
- Split-family and schema-validator ownership remains conditional on the owning task's
  exact test, static, manifest, and line-cap receipts. This document makes no unvalidated
  full-lane or coverage-completion claim.
