# 890. TASK-322 session expiry resilience

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-322, TASK-322-02, TASK-322-03, TASK-322-04

## Key Changes

### Shared expired-session contract

- PageEditor now keeps unsaved draft state visible and shows actionable
  expired-session guidance for save, publish, and page-settings save flows.
- Posts Feed picker and preview-resource consumers now render shared
  expired-session guidance instead of raw auth failure text.

### Family closure

- The Posts Feed report no longer routes BUG-06 / BUG-09 to an open platform
  follow-up; those rows now point at the landed TASK-322 leaves.
- TASK files, board state, and changelog entries now reflect the full shared
  session-expiry family as closed.

## Validation

- `bun run test:vitest -- tests/vitest/admin/apiClient.test.ts`
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`
