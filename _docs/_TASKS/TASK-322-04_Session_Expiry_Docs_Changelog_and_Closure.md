# TASK-322-04: Session Expiry Docs, Changelog, and Closure

# FileName: TASK-322-04_Session_Expiry_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Documentation + QA + Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-322-01, TASK-322-02, TASK-322-03
**Status:** To Do

---

## Overview

Close the shared session-expiry follow-up family after the shared client and
consumer leaves land.

This leaf owns the final evidence pass only. It must reconcile report evidence,
security docs, task-board state, and changelog entries against the implemented
shared behavior.

## Sub-Tasks

- None. This is an execution-ready leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Record final fixed/current-state/deferred evidence for the shared session-expiry findings. |
| `_docs/SECURITY_SPEC.md` | Reflect the final shared admin CSRF/session recovery policy only if it changed materially. |
| `_docs/_TASKS/TASK-322*.md` | Update statuses, dependencies, and validation notes. |
| `_docs/_TASKS/README.md` | Move `TASK-322*` rows through final board state and update statistics. |
| `_docs/_CHANGELOG/<next>-<date>-task-322-session-expiry-recovery.md` | Add the closure changelog entry. |
| `_docs/_CHANGELOG/README.md` | Register the new changelog entry. |

## Implementation Pseudocode

```md
| Finding | Resolution | Evidence | Owner |
|---|---|---|---|
| BUG-06 | Fixed | `page-editor-shell-wave` + `posts-feed-editor-wave` | TASK-322-02 / TASK-322-03 |
| BUG-09 root cause | Fixed | shared client classification + consumer adoption | TASK-322-01 / TASK-322-03 |
```

## Data Flow

1. Re-read the implemented shared client, page-editor shell, and consumer
   adoption leaves.
2. Update report/security/task/changelog artifacts from live evidence rather
   than proxy claims.
3. Record exact validation commands and outcomes for the landed shared family.
4. Move the board and task statuses only after docs and evidence agree.

Error handling:

- Keep the family open if any shared leaf is still incomplete or evidence is
  indirect.
- Do not overclaim widget-local fixes for shared client behavior.
- If validation fails outside the shared owner surface, record the blocker
  explicitly instead of hiding it in closure notes.

Regression-test shape:

```ts
test("closure evidence references every shared session-expiry owner leaf", () => {
  expect(finalMatrix.every((row) => row.owner.startsWith("TASK-322-"))).toBe(true);
});
```

## Security Contract

No new routes are added by this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged existing admin
  contracts only.
- Reject-unknown validation: closure must confirm no auth/session payloads were
  widened outside the agreed shared leaves.
- Anti-abuse: closure must confirm no browser-persisted privileged state or
  auth bypasses were introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/apiClient.test.ts`
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/SECURITY_SPEC.md` only if the shared recovery policy changed materially
- `_docs/_TASKS/TASK-322*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/<next>-<date>-task-322-session-expiry-recovery.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- `TASK-322` is broken into physical implementation leaves with explicit owners.
- Report, security docs, task board, and changelog agree with the landed shared
  behavior.
- Final validation records exact commands and results for the shared family.
