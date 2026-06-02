# 1069 - Gallery Mosaic widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-379, TASK-379-01, TASK-379-02, TASK-379-03

## Key Changes

- Added a widget-owned lightbox eligibility helper and reused it for both public
  renderer markers and Advanced diagnostics.
- Updated Advanced copy so selected lightbox mode with zero eligible media
  tiles reports inactive runtime behavior instead of `Lightbox, fill zoom`.
- Replaced per-item Gallery Mosaic `Remove` native confirmation with the shared
  `ConfirmActionDialog` cancel/accept flow.
- Extended widget Playwright smoke media fixtures to Gallery Mosaic with a
  deterministic image seed, optional video seed handling for storage policies,
  and a MediaPicker publish plus public lightbox open/close proof.
- Updated Gallery Mosaic widget docs, the 31-05 UI report, report index, task
  docs, and task board.

## Validation

- Focused regressions failed before implementation for the missing eligibility
  helper, native Remove path, and stale Advanced lightbox summary.
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget gallery-mosaic --output-json .tmp/task-379-gallery-mosaic-smoke-dry-run.json --output-md .tmp/task-379-gallery-mosaic-smoke-dry-run.md`
- Full live Playwright replay was not run because local admin/frontend servers
  and `CODERSO_PLAYWRIGHT_EMAIL` / `CODERSO_PLAYWRIGHT_PASSWORD` were not
  available in this environment.
