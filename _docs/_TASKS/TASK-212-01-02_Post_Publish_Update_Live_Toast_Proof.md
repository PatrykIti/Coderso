# TASK-212-01-02: Post Publish Update Live Toast Proof
# FileName: TASK-212-01-02_Post_Publish_Update_Live_Toast_Proof.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Accessibility + QA
**Estimated Effort:** Small
**Dependencies:** TASK-212-01-01
**Status:** To Do

---

## Overview

Add proof that Posts publish/update feedback reaches the visible Sonner surface
and accessibility live-region path.

`TASK-204` proved the toaster host configuration, but the 2026-04-25 replay
still found no `[data-sonner-toast]` and an empty `[aria-live=polite]` region
after a successful publish. This leaf must close that exact evidence gap.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
- `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx` only if the app host proof needs a
  stricter assertion
- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` during closure

## Implementation Direction

1. Keep mocked adapter tests, but add at least one browser-like render proof
   that a publish/update action creates the same DOM contract the Playwright
   replay inspected.
2. Prefer asserting the Sonner contract by visible selectors:
   - `[data-sonner-toast]`
   - `aria-live`
   - `Admin notifications`
3. Keep the test isolated from real network and navigation under the Vitest
   happy-dom guardrails.

Pseudocode:

```ts
await clickPublish();
await waitFor(() => {
  expect(container.querySelector("[data-sonner-toast]")?.textContent)
    .toContain("Post published.");
});
```

If Sonner cannot render real DOM in the current test harness, add a minimal
host-level integration test around the project `Toaster` wrapper and explicitly
record the remaining manual Playwright proof requirement in this leaf.

## Security Contract

- No route or auth change.
- Toast proof must use sanitized user-facing copy only.
- Test fixtures must not include real tokens, cookies, or production URLs.

## Testing Requirements

- Vitest:
  - publish success creates visible toast/liver-region output;
  - update success creates visible toast/live-region output;
  - failure path creates bounded error toast.
- Manual Playwright CLI:
  - publish a draft post and assert the toast/live-region;
  - update a published post and assert the toast/live-region;
  - capture console output to prove no new notification/a11y warnings.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`

## Acceptance Criteria

1. The same selector evidence that failed on 2026-04-25 now passes.
2. Publish and update are both covered.
3. The task cannot be closed with only a mocked `toast.success` assertion.
