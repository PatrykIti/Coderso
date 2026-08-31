# Runner Ownership Matrix

Snapshot date: `2026-08-21`

This document is the practical ownership companion to `_docs/TESTING_STRATEGY.md`.
It reflects the post-TASK-580 lane: the widget v1 surfaces (`core/widgets/*` and the
legacy widget editor suites) were removed, and the Bun-free lane is fully owned by
Vitest under `tests/vitest/`.

## Current classification snapshot

- Vitest-owned test files under `tests/vitest/`: `958` (`.test.ts` / `.test.tsx`)
- Bun-owned suites: `463` test files across `tests/unit` (`292`),
  `tests/integration` (`152`), `tests/perf` (`5`), and `tests/security` (`14`)
- The 2026-03-06 `move to Vitest` / `keep in Bun` / `refactor first` triage is
  closed: the refactor-first blockers were either migrated to Vitest or
  intentionally left in Bun for DB/runtime reasons. Ownership is now decided by
  runtime requirement (Bun for DB/runtime/plugin/security/perf semantics) vs
  Bun-free (Vitest).

## Strong Vitest ownership clusters

- `tests/vitest/ui/*` (admin UI, including the menus, users/roles, and booking
  families below)
- `tests/vitest/ui-integration/*` (migrated from `tests/integration/ui/*`)
- `tests/vitest/assistant/*` (assistant services, planner, and blueprint families)
- `tests/vitest/pages/*`
- `tests/vitest/posts/*`
- `tests/vitest/forms/*`
- `tests/vitest/search/*`
- `tests/vitest/server/*`
- `tests/vitest/validation/*`
- `tests/vitest/sdk/*`

### Split families (TASK-105-08-11, oversized-file line gate)

The four pre-split monoliths were split by cohesive responsibility so owning
leaves can extend them without exceeding the 1000-line gate. Each test part keeps
the original test names and assertions and runs independently; shared builders
live in the named fixture modules.

- Menus (`tests/vitest/ui/`):
  - `menu-design-editor-structure.test.tsx` (shell, seeding, composer, undo/redo)
  - `menu-design-editor-canvas.test.tsx` (per-device overrides, badges, Reset,
    canvas WYSIWYG, ghost)
  - `menu-design-editor-brand-nav.test.tsx` (brand text/style/level/image, nav)
  - `menu-design-editor-block-fields.test.tsx` (F1/F2, B1–B5, R1(b), R3a/R3b)
  - `menu-design-editor-controls.test.tsx` (scrolled/radius/shadow, brand icon)
  - `menuDesignEditorFixtures.tsx` (shared state, mocks, harness)
- Users / roles (`tests/vitest/ui/`):
  - `users-roles-users-invite.test.tsx` (user lifecycle, invite, reset, 403 refresh)
  - `users-roles-permissions.test.tsx` (role duplication, read-only, access deny)
  - `usersRolesFixtures.tsx` (shared mocks, harness, default state)
- Booking (`tests/vitest/ui/`):
  - `booking-page-wave.test.tsx`, `booking-page-errors.test.tsx`,
    `booking-page-schedule-crud.test.tsx`, `booking-page-tabs.test.tsx` (importers)
  - `bookingFixtures.resources.tsx` (state + booking client + ResourcesTab + harness)
  - `bookingFixtures.services.tsx` (ServicesTab)
  - `bookingFixtures.schedules.tsx` (AvailabilityTab)
  - `bookingFixtures.submissions.tsx` (ReservationsTab + SlotPreviewTab)
- Assistant blueprints (`tests/vitest/assistant/`):
  - `blueprint-action-assembler-blocks.test.ts` (content-type / listing / query merges)
  - `blueprint-action-assembler-bindings.test.ts` (merge key, conflict dedupe)
  - `blueprint-action-assembler-sections.test.ts` (composed-plan graph flows)
  - `blueprintActionAssemblerFixtures.ts` (shared plan/fragment/graph builders)

## Follow-up migration notes (2026-03-12)

- Legacy Bun-free duplicates were removed from `tests/unit/ui/*`, the Bun-free part of `tests/unit/admin/*`, `tests/unit/sdk/*`, and `tests/unit/customScreens/*` after confirming Vitest-owned replacements.
- `tests/unit/validation/*` has now been moved into `tests/vitest/validation/*`.
- The Bun-free assistant helper slice (`assistantMetrics`, `assistantQuota`, `assistantRedaction`, `openRouterProvider`, `siteBuilderPlanner`) has now been moved into `tests/vitest/assistant/*`.
- The Bun-free posts editor/model helper slice has now been moved into `tests/vitest/posts/*`, while the DB/runtime post cases remain in Bun.
- The Bun-free forms contract/helper slice has now been moved into `tests/vitest/forms/*`, while DB-backed service/submission cases remain in Bun.
- The Bun-free forms automation runner core now lives in `core/services/forms/formAutomationRunnerCore.ts`, and its orchestration suite has moved to `tests/vitest/forms/formAutomationRunnerCore.test.ts`; the runtime wrapper in `formAutomationRunner.ts` remains lazy and server-owned.
- The Bun-free server helper slice (`errorHandler`, `requestBody`, `routeMatcher`, `solutionKitSchemas`, `styleUrl`) has now been moved into `tests/vitest/server/*`.
- The Bun-free search pure-logic slice (`filterEngine`, `listingRuntimeService`, `searchIndexService`, `searchService`) has now been moved into `tests/vitest/search/*`.
- `search` remains split:
  - `searchHistoryService` stays in Bun because it is DB-backed,
  - the remaining search unit backlog is now the DB-backed history case only.

## Refactor-first closure update (2026-03-12)

- The original refactor-first blocker set from the 2026-03-06 snapshot is now either migrated to Vitest or intentionally left in Bun for DB/runtime reasons.
- `formAutomationRunner` was the last mixed forms blocker in that set and is now closed through the new Vitest-owned core plus lazy runtime wrapper.

## Strong Bun ownership clusters

- DB-backed service tests
- plugin lifecycle tests
- `tests/integration/routes/*`
- `tests/integration/runtime/*`
- `tests/integration/server/*`
- `tests/integration/store/*`
- `tests/perf/*`
- `tests/security/*`

## Historical refactor-first clusters

- `assistant`
- `posts`
- `forms`
- `search`
- `server`
- `validation`

These areas described the 2026-03-06 baseline and have since been addressed by the migration and refactor waves above.

## Bun coverage hotspots from baseline report

Representative low-coverage files from the historical `coverage/bun/lcov.info`
baseline (pre-TASK-580):

| File | Line coverage |
|------|---------------|
| `core/admin/utils/cacheBus.ts` | `1.33%` |
| `core/admin/services/cachePolicy.ts` | `1.79%` |
| `packages/sdk/src/pluginManifest.ts` | `3.50%` |
| `core/services/search/filterContract.ts` | `3.79%` |
| `core/services/customScreens/bindingResolver.ts` | `6.15%` |

## Operational rule

- If a suite does not require Bun runtime, it should not stay in Bun just to preserve old structure.
- If a suite requires DB/runtime/plugin lifecycle behavior, keep it in Bun even if that slows down migration.
