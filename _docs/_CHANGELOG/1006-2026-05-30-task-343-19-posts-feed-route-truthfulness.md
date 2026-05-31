# 1006 - TASK-343-19 Posts Feed route truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-19

## Key Changes

- Added Posts Feed route-state classification for missing detail/list routes,
  missing View all destinations, and all-items-visible View all states.
- Made Posts Feed public output explain missing card links, disabled CTAs, and
  unavailable View all actions instead of dropping navigation silently, while
  keeping generic href-less Content List cards on the non-route fallback.
- Verified the current Posts Feed smoke inventory points at `/posts-feed-test-page`
  and added regression coverage against the stale listing-filters fixture and
  missing `/test-posts-feed-0516` route.

## Validation

- `bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-19
  drift review: no blockers)
