# 880. TASK-277 posts feed widget follow-ups

Date: 2026-05-20
Version: Unreleased
Tasks: TASK-277, TASK-277-01, TASK-277-02, TASK-277-03, TASK-277-04, TASK-277-05, TASK-277-06, TASK-277-07, TASK-277-08

## Key Changes

### Posts Feed runtime and editor completion
- Posts Feed now owns truthful source-mode behavior, real post media/tag mapping, cumulative `load-more`, stable `view-all`, author/date filters, featured-first ordering, section chrome, bounded motion, and the shared image-aspect bridge.
- The manual picker now supports search, keyboard-accessible ordering, and clearer retry/auth guidance.
- Admin preview now uses the real `PageEditor` preview-state bridge and transient resolved data patches instead of persisting preview-only runtime data.

### Shared follow-up routing and closure evidence
- The analogous legacy `content-list` pagination residual rediscovered during TASK-277 was split into `TASK-323` instead of being patched ad hoc inside the Posts Feed family.
- The Posts Feed report, widget docs, task board, and scoped validation evidence are now synchronized for closeout.

## Validation

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/content/contentMediaResolver.test.ts tests/unit/content/contentListResolver.test.ts tests/integration/runtime/posts-feed-runtime-pagination.test.ts`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/page-editor-posts-feed-preview.test.tsx`
- Scoped closeout approved by the user after the broader shared DB / environment became contention-prone during parallel-agent work.
