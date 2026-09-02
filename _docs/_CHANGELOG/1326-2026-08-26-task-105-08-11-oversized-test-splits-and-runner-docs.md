# 1326. TASK-105-08-11 Oversized Test Splits and Runner Docs — Closure

**Date:** 2026-08-26
**Version:** Unreleased
**Tasks:** TASK-105, TASK-105-08, TASK-105-08-11, TASK-105-11-03-05

## Key Changes

### Test-only split of four oversized Vitest files (1000-line gate)
- `menu-design-editor.test.tsx` (2711 lines) → `structure` / `canvas` /
  `brand-nav` / `block-fields` / `controls` (+ shared `menuDesignEditorFixtures.tsx`),
  handed downstream to `TASK-105-08-05` (which later added `canvas-units` and
  `revalidation` parts).
- `users-roles-page-wave.test.tsx` (1132) → `users-invite` / `permissions`
  (+ shared `usersRolesFixtures.tsx`), handed downstream to `TASK-105-08-09`.
- `bookingPageFixtures.tsx` (1123, fixture module) →
  `bookingFixtures.{resources,services,schedules,submissions}`,
  handed downstream to `TASK-105-08-08`.
- `blueprint-action-assembler.test.ts` (1050) → `blocks` / `bindings` /
  `sections` (+ shared `blueprintActionAssemblerFixtures.ts`),
  handed downstream to `TASK-105-08-07`.
- Mechanical move: no assertions changed, every part independently runnable
  and ≤ 1000 lines, original test names preserved for comparable gate receipts.

### Runner documentation (post-TASK-580 lane)
- `tests/RUNNER_OWNERSHIP.md` rewritten: 1,126 Vitest files, Bun-manifest
  snapshot 2026-08-22; the four split families recorded under their Vitest
  clusters with their downstream owning leaves; widget v1 surface references
  removed; strong-Bun clusters (DB, runtime, plugin, media, public-write,
  perf, security) left unchanged.
- `tests/bun-lane-manifest.json` re-verified against the current lane; the only
  authorized test-file list delta is present (task540 runtime-smoke rows added
  by the TASK-540 stream; `schemaValidator.test.ts` removed per the child-08
  transfer below). No unrelated rows were touched.

### Server ownership freeze handoff (`TASK-105-11-03-05` sync)
- The four retained Bun server suites (`adminAssetsRouting`,
  `publicBookingApi`, `publicFormsApi`, `publicFormsUploadApi`) remain in Bun
  with recorded DB/runtime/media/public-write-security reasons.
- `tests/unit/server/schemaValidator.test.ts` transferred to
  `TASK-105-11-03-08`: its eight behavior groups move to the post/content/
  assistant Vitest writers (`postSchemas`, `contentSchemas`,
  `assistantActionSchemas`), and the generic
  `tests/vitest/validation/schemaValidator.test.ts` remains read-only.

### Validation
- Every split TEST part runs alone green; the combined pre-split replacement
  set passes with the same result (no assertion changed).
- Line-count gate ≤ 1000 held on every split part and fixture module.
- `git diff --check` clean for the runner-doc rewrite and split changes.
- Root `tsc` shows zero diagnostics attributable to this family (repo-wide
  errors are isolated to unrelated concurrent streams' in-flight test files).
