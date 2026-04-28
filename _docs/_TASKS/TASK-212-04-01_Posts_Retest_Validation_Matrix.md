# TASK-212-04-01: Posts Retest Validation Matrix
# FileName: TASK-212-04-01_Posts_Retest_Validation_Matrix.md

**Priority:** Medium
**Category:** CMS/Posts + QA
**Estimated Effort:** Small
**Dependencies:** TASK-212-01, TASK-212-02, TASK-212-03
**Status:** Done (2026-04-26)

---

## Overview

Collect and run the final validation matrix for the 2026-04-25 and 2026-04-26
Posts retest follow-ups.

This leaf owns evidence, not implementation. It should not add new product
behavior unless a test failure exposes a small missing fix in an already-owned
leaf.

## Sub-Tasks

No child task files.

## Testing Requirements

Always run:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/action-toasts.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/sonner.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-editor-state-hook-wave.test.tsx tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`

When `TASK-212-02` changes Create New Post drawer:

- focused Posts drawer a11y suite, or the existing Posts list/create drawer
  suite that owns the component after its sheet harness is made faithful enough
  to catch a missing `aria-describedby` target.

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
- reject one publish/update path and assert bounded error toast plus inline
  editor error state;
- open Create New Post and assert no Radix warning;
- open Media tab and verify accepted/deferred media state;
- capture console/network output and distinguish browser-visible errors from
  server logs.

Source-state matrix to preserve:

| Source finding | Latest source state | Validation owner |
|---|---|---|
| `BUG-5` publish/update toast | Fixed live on 2026-04-26; wrapper hardening still required | `TASK-212-01-*` adapter, failure, cache/update, and Playwright regression proof |
| `BUG-8` Create New Post description | Open on 2026-04-26 | `TASK-212-02-*` sheet description and console-clean proof |
| `UX-4` media block gap | Open/deferred on 2026-04-26 | `TASK-212-03-*` full implementation or explicit deferral |
| 2026-04-26 toolbar/delete/empty-block observations | Out of TASK-212 scope unless separately added | Record as separate future task only if product accepts them |

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
3. Playwright evidence uses the same selectors/console checks that found and
   then rechecked the 2026-04-25/2026-04-26 issues.
