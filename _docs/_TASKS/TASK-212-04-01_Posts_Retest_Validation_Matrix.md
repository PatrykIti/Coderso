# TASK-212-04-01: Posts Retest Validation Matrix
# FileName: TASK-212-04-01_Posts_Retest_Validation_Matrix.md

**Priority:** Medium
**Category:** CMS/Posts + QA
**Estimated Effort:** Small
**Dependencies:** TASK-212-01, TASK-212-02, TASK-212-03
**Status:** To Do

---

## Overview

Collect and run the final validation matrix for the 2026-04-25 Posts retest
follow-ups.

This leaf owns evidence, not implementation. It should not add new product
behavior unless a test failure exposes a small missing fix in an already-owned
leaf.

## Sub-Tasks

No child task files.

## Testing Requirements

Always run:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/action-toasts.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/sonner.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`

When `TASK-212-02` changes Create New Post drawer:

- focused Posts drawer a11y suite, or the existing Posts list/create drawer
  suite that owns the component.

When `TASK-212-03` implements media block types:

- `bun run test:vitest -- tests/vitest/posts/postBlockDocument.test.ts tests/vitest/posts/post-block-normalizer-writing-canvas.test.ts tests/vitest/posts/post-block-runtime-renderer.test.tsx tests/vitest/posts/post-block-transforms.test.ts tests/vitest/ui/post-block-inserter-wave.test.tsx tests/vitest/ui/block-inserter-wave.test.tsx`

When route/runtime behavior changes:

- verify `DATABASE_URL` reachability first;
- run with env loaded:
  `set -a && source .env && set +a`;
- execute the exact Bun route/runtime suites for the touched contracts.

Manual Playwright CLI:

- publish draft post and assert visible toast/live-region;
- update published post and assert visible toast/live-region;
- open Create New Post and assert no Radix warning;
- open Media tab and verify accepted/deferred media state;
- capture console/network output and distinguish browser-visible errors from
  server logs.

## Security Contract

- Test fixtures must not include real tokens, cookies, or private media URLs.
- If media runtime rendering is touched, include unsafe URL/provider regression
  proof.
- If DB-backed tests run, use repo `.env` and report DB availability clearly.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Final validation covers every touched seam.
2. Skipped DB/runtime validation is explicitly explained.
3. Playwright evidence uses the same selectors/console checks that found the
   2026-04-25 issues.
