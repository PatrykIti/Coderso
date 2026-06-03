# 1072 - Content List widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-382, TASK-382-01, TASK-382-02

## Key Changes

- Cleared dormant legacy taxonomy/search/featured/author filters when Content
  List switches into listing-query mode, both in the Wizard transition and in
  the owner-side normalizer.
- Added focused UI and normalizer regressions so Advanced no longer reports
  hidden legacy taxonomy as active for listing-mode payloads.
- Added deterministic Content List smoke fixture bootstrap through authenticated
  admin page APIs with CSRF, preserving page metadata and publishing the fixture.
- Added Content List `contentProof` coverage for populated admin/public cards,
  image, tags, CTA, load-more runtime, and view-all rendering.
- Updated Content List widget docs, the 31-05 UI report, smoke inventory, task
  docs, and task board.

## Validation

- Focused regressions failed before implementation for stale taxonomy,
  listing-mode normalizer state, and missing Content List smoke fixture helpers.
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun test tests/unit/widgets/contentList.test.tsx tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget content-list --output-json .tmp/task-382-content-list-smoke-dry-run.json --output-md .tmp/task-382-content-list-smoke-dry-run.md`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Full live Playwright replay was not run because
  `CODERSO_PLAYWRIGHT_EMAIL` / `CODERSO_PLAYWRIGHT_PASSWORD` were not
  available in `.env`.
