# 989 - Widget contract Bun expectation drift repair

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-340

## Key Changes

- Repaired the failing full `bun run test:bun` lane by aligning stale
  `Content List` and `Posts Feed` Bun assertions with the current widget
  editor-contract shape shipped after `TASK-339`.
- `Content List` now expects the live read-only `Advanced` section order:
  `source summary`, `style summary`, and `runtime summary`.
- `Posts Feed` no longer expects the retired
  `posts-feed.advanced.runtime-summary` section and now follows the live
  read-only diagnostics contract.
- Runtime and widget behavior remain unchanged; the repair is limited to Bun
  expectations, task tracking, and changelog synchronization.

## Validation

- `bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:bun`
