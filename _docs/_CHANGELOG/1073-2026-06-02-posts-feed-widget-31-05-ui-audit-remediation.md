# 1073 - Posts Feed widget 31-05 UI audit remediation

Date: 2026-06-02
Version: Unreleased
Tasks: TASK-383, TASK-383-01, TASK-383-02

## Key Changes

- Moved Posts Feed active source-filter labeling into the widget owner and wired
  Advanced diagnostics to the runtime-active helper.
- Preserved saved `source.category` as dormant state outside `category` mode
  while preventing Latest, Featured, and Manual diagnostics from reporting it
  as an active filter.
- Added deterministic Posts Feed smoke fixture bootstrap through authenticated
  admin post/page APIs with CSRF: three fixture posts are created or updated,
  metadata is patched, an enabled `/fixture-posts/:slug` posts route is ensured,
  posts are published, and `/posts-feed-test-page` is patched and published with
  populated resolved data.
- Added Posts Feed `postsProof` coverage for populated admin/public cards,
  image, tags, CTA, load-more runtime, motion wrapper, and view-all rendering.
- Updated Posts Feed widget docs, the 31-05 UI report, smoke inventory, task
  docs, and task board.

## Validation

- Focused regressions failed before implementation for inactive category
  Advanced copy and missing Posts Feed smoke fixture helpers.
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget posts-feed --output-json .tmp/task-383-posts-feed-smoke-dry-run.json --output-md .tmp/task-383-posts-feed-smoke-dry-run.md`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run precommit`
- Full live Playwright replay was not run because
  `CODERSO_PLAYWRIGHT_EMAIL` / `CODERSO_PLAYWRIGHT_PASSWORD` were not
  available in `.env`.
