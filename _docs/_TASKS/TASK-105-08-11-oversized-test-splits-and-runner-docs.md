# TASK-105-08-11: Oversized Test Splits and Runner Docs
# FileName: TASK-105-08-11-oversized-test-splits-and-runner-docs.md

**Priority:** High  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** None (lands first)
**Parent Task:** TASK-105-08  
**Status:** ✅ Done
**Implementation Complete:** 2026-08-21 (`127e39c0`)
**Closure Complete:** 2026-08-26 (family rebaseline + changelog entry 1326)

---

## Overview

Split the four Vitest files that exceed the 1000-line gate by cohesive responsibility,
so the gap-closure leaves (05/07/08/09) can extend them without violating the line gate.
Then rewrite `tests/RUNNER_OWNERSHIP.md` to reflect the post-widget-removal lane and
re-verify `tests/bun-lane-manifest.json` if any test-file list changed. This leaf does
NOT close product coverage gaps and does NOT edit product code.

## Scope

Four oversized files (verified line counts at HEAD):

| File | Lines | Split responsibility |
|---|---:|---|
| `tests/vitest/ui/menu-design-editor.test.tsx` | 2711 | structure / design-canvas / brand-nav / block-fields / controls |
| `tests/vitest/ui/users-roles-page-wave.test.tsx` | 1132 | users-invite / roles-permissions |
| `tests/vitest/ui/bookingPageFixtures.tsx` | 1123 | resources / services / schedules / submissions fixtures |
| `tests/vitest/assistant/blueprint-action-assembler.test.ts` | 1050 | block-assembly / binding-assembly / section-assembly |

Docs owned by this leaf:

- `tests/RUNNER_OWNERSHIP.md` (rewrite)
- `tests/bun-lane-manifest.json` (re-verify and update only for the authorized test-file list delta)

## Single-Writer File Ownership

- This leaf is the SOLE writer of the four oversized test files and of
  `tests/RUNNER_OWNERSHIP.md`. No other leaf may edit these files.
- After the split, the resulting named suites are HANDED OFF to their owning leaves:
  menu suites → TASK-105-08-05, blueprint-action-assembler suites → TASK-105-08-07,
  booking fixtures → TASK-105-08-08, users/roles suites → TASK-105-08-09. Those leaves
  extend the split pieces, never the pre-split monoliths.
- This leaf reads `tests/bun-lane-manifest.json` during preflight and is the sole writer for
  the authorized test-file list delta described above. It must preserve unrelated guarded rows
  and stop on any unowned manifest change. Source modules remain read-only.

## Pseudocode

Split rules (must hold for every resulting part):

1. Each TEST part is an independently runnable Vitest file: it imports its own
   fixtures, declares its own `describe` blocks, and passes when invoked alone with
   `vitest run --config vitest.config.ts <part>`. FIXTURE parts (e.g. the split
   `bookingFixtures.*` modules) are not runnable tests; they are validated by running
   the importing booking suites against them.
2. Shared builders move into a clearly named fixture module per family, and the fixture
   module itself stays under 1000 lines; if it would exceed 1000, split the fixture by
   domain too.
3. No assertions change. This is a mechanical move plus minimal import-path rewrites;
   coverage behavior is preserved byte-for-byte for assertions and fixtures.
4. Every part keeps the original test names so gate receipts remain comparable.

```ts
// before: tests/vitest/ui/menu-design-editor.test.tsx (2711 lines)
// after:
//   tests/vitest/ui/menu-design-editor-structure.test.tsx     (~600)
//   tests/vitest/ui/menu-design-editor-canvas.test.tsx        (~550)
//   tests/vitest/ui/menu-design-editor-brand-nav.test.tsx     (~600)
//   tests/vitest/ui/menu-design-editor-block-fields.test.tsx  (~550)
//   tests/vitest/ui/menu-design-editor-controls.test.tsx      (~450)
//   tests/vitest/ui/menuDesignEditorFixtures.tsx              (shared, <1000)
```

```ts
// tests/vitest/ui/users-roles-page-wave.test.tsx (1132)
//   tests/vitest/ui/users-roles-users-invite.test.tsx  (~600)
//   tests/vitest/ui/users-roles-permissions.test.tsx   (~550)
//   tests/vitest/ui/usersRolesFixtures.tsx             (shared, <1000)
```

```ts
// tests/vitest/ui/bookingPageFixtures.tsx (1123) — fixture module
//   tests/vitest/ui/bookingFixtures.resources.tsx
//   tests/vitest/ui/bookingFixtures.services.tsx
//   tests/vitest/ui/bookingFixtures.schedules.tsx
//   tests/vitest/ui/bookingFixtures.submissions.tsx
//   (re-export barrel optional; importers updated to the specific fixture module)
```

```ts
// tests/vitest/assistant/blueprint-action-assembler.test.ts (1050)
//   tests/vitest/assistant/blueprint-action-assembler-blocks.test.ts
//   tests/vitest/assistant/blueprint-action-assembler-bindings.test.ts
//   tests/vitest/assistant/blueprint-action-assembler-sections.test.ts
//   tests/vitest/assistant/blueprintActionAssemblerFixtures.ts (shared, <1000)
```

Runner docs rewrite checklist for `tests/RUNNER_OWNERSHIP.md`:

1. Update the snapshot date and classification snapshot to the current lane (1,126 Vitest
   test files, post TASK-580 widget v1 removal).
2. Remove any reference to widget editor suites or `core/widgets/*` ownership that died
   with TASK-580.
3. Record the four split families under their Vitest clusters (menus, users/roles,
   booking, assistant).
4. Keep strong-Bun clusters (DB-backed services, plugin lifecycle, route/runtime/
   integration, perf, security) unchanged unless a moved test changed them.

## Validation Gates

- For each split part, run it alone:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/menu-design-editor-structure.test.tsx`
- Run the full pre-split suite's replacement set together and confirm the same pass/fail
  result as before the split (no assertion changed).
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- line-count gate: every part and fixture module ≤ 1000 lines.
- `bun --cwd core lint` on docs-only changes is not required; the doc rewrite is
  verified by `git diff --check`.

## 1000-Line Rule

This leaf exists to enforce it: every split part must be ≤ 1000 lines and independently
runnable. If a part would still exceed 1000, split again by the next responsibility seam.

## Security Contract

Test-only, no API surface. Docs change only.

## Acceptance Criteria

1. No `tests/vitest/**` file remains above 1000 lines for these four families.
2. Each split TEST part runs independently and the combined result is unchanged;
   fixture parts are validated by the importing suites.
3. `tests/RUNNER_OWNERSHIP.md` reflects the post-widget-removal lane and the new splits.
4. `tests/bun-lane-manifest.json` is re-verified (and only edited if a list changed).

## Closure Evidence (2026-08-26, orchestrator-verified)

- **Split landing:** all four families split and monoliths removed. On-disk parts:
  menus → `structure`, `canvas`, `canvas-units`, `revalidation`, `brand-nav`,
  `block-fields`, `controls` + `menuDesignEditorFixtures.tsx` (7 test parts +
  fixture; `canvas-units` and `revalidation` include later 08-05-stream
  extensions); users/roles → `users-invite`, `permissions` +
  `usersRolesFixtures.tsx`; booking → `booking-page-wave/errors/schedule-crud/
  tabs` + `bookingFixtures.{resources,services,schedules,submissions}`; assistant
  → `blueprint-action-assembler-{blocks,bindings,sections}` +
  `blueprintActionAssemblerFixtures.ts`. All parts `wc -l ≤ 1000` (max family
  part 842 = `menu-design-editor-block-fields.test.tsx`); the pre-split monoliths (`menu-design-editor.test.tsx`,
  `users-roles-page-wave.test.tsx`, `blueprint-action-assembler.test.ts`) no
  longer exist. No part in the four families exceeds 1000 physical lines.
- **Runnable receipt:** every split TEST part passes when invoked alone via the
  targeted Vitest lane; the downstream owning leaves (05/07/08/09) have extended
  the parts and their own gates pass.
- **Runner docs:** `tests/RUNNER_OWNERSHIP.md` rewritten to the post-TASK-580
  lane (1,126 Vitest files, Bun-manifest snapshot 2026-08-22T18:13:50.719Z),
  the four split families recorded under their Vitest clusters with their
  downstream owning leaves, widget v1 surface references removed, strong-Bun
  clusters unchanged. Rebaseline correction (this closure): the Menus list now
  also records `menu-design-editor-revalidation.test.tsx` (08-11 split part)
  and `menu-design-editor-canvas-units.test.tsx` (08-05 extension) so the
  runner table matches the current on-disk family.
- **Manifest:** `tests/bun-lane-manifest.json` re-verified against the current
  lane. The authorized test-file list delta is present and nothing unrelated
  was touched: `generatedAt` refreshed to 2026-08-22T18:13:50.719Z, two
  `task540-*` runtime-smoke rows added by the TASK-540 stream, and
  `tests/unit/server/schemaValidator.test.ts` removed per the child-08 transfer.
  The four split monoliths are Vitest files and were never rows in the Bun
  manifest.
- **Changelog:** entry `1326-2026-08-26-task-105-08-11-oversized-test-splits-and-runner-docs.md`
  authored; `_docs/_CHANGELOG/README.md` index row + reservation prose updated.
- **Downstream sync (11-03-05 / 11-04):** the four-suite server Bun ownership
  freeze (adminAssetsRouting, publicBookingApi, publicFormsApi,
  publicFormsUploadApi — all verified present, manifest bucket B) and the
  schema-validator transfer to `TASK-105-11-03-08` are recorded in
  `tests/RUNNER_OWNERSHIP.md`. Verification of the transfer state in the dirty
  tree (2026-08-26): `tests/unit/server/schemaValidator.test.ts` is deleted (D)
  and all three destination writers are present — `postSchemas.test.ts` (M),
  `contentSchemas.test.ts` (??), `assistantActionSchemas.test.ts` (??) — i.e.
  the child-08 migration is in flight and its board row ("To Do") is stale
  pending that leaf's own validation receipt, which `TASK-105-11-04` must
  consume before closing. `TASK-105-11-03-05` remains To Do pending its own
  receipt + parent-author board sync; `TASK-105-11-04` remains blocked on the
  `TASK-105-11-03-08` validation receipt; the `TASK-105-08-12` final
  rebaseline it also depended on has since landed (Done 2026-08-26, EXIT=0
  artifact 2026-08-26T17:13:40) and no longer blocks. Neither leaf's file is
  claimed here.
