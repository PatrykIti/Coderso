# TASK-343-19: Posts Feed Audit Remediation Family

# FileName: TASK-343-19_Posts_Feed_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Posts Feed + Fixture Routing + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close the Posts Feed audit drift where the assigned fixture/route was wrong,
the public route returned `404`, card navigation could not be verified because
no list/detail route was configured, and `View all` can disappear without
actionable editor feedback.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_POSTS_FEED_WIDGET.md:11-30,120-160`
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
- `core/widgets/core/postsFeed.tsx`
- Page fixture/bootstrap data that owns the posts-feed audit route.

## Sub-Tasks

- [x] Separate the 28-05 audit-assignment drift from current repo fixture state:
  confirm the current inventory route points at Posts Feed, then only repair
  fixture/bootstrap data if the checked-out repo still points to a wrong page or
  public `404`.
- [x] Make missing list/detail route consequences explicit for cards, item
  links, and any CTA/read-more affordance.
- [x] Explain or prevent silent `View all` disappearance when the destination is
  missing or all posts are already visible.
- [x] Add fixture/route regression coverage so future deep-audit prompts cannot
  point to a non-Posts-Feed page or a public `404`.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Surface route/link and view-all ownership truthfully. |
| `core/widgets/core/postsFeed.tsx` | Keep Posts Feed-to-Content List mapping truthful for route/link state. |
| `core/widgets/core/contentList.tsx` | Keep missing-route card/link and view-all output explicit and accessible, because Posts Feed delegates card rendering through Content List. |
| Fixture/bootstrap data for widget audit pages | Reconcile Posts Feed admin fixture and public route. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Extend existing Bun-owned Posts Feed widget/resolver coverage for missing-route and view-all visibility semantics. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover editor route guidance and fixture assumptions. |

## Implementation Pseudocode

```ts
function resolvePostsFeedRouteState(resolved: PostsFeedData["resolved"], data: PostsFeedData) {
  const items = normalizeResolvedItems(resolved?.items);
  if (items.some((item) => !item.href?.trim()) || !resolved?.listPath?.trim()) {
    return { mode: "missing_detail_route" };
  }
  if (data.pagination?.mode === "view-all" && !data.pagination.viewAllHref) {
    return { mode: "missing_view_all_destination" };
  }
  return { mode: "ready", basePath: resolved.listPath };
}
```

Current repo evidence may already route Posts Feed through
`_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json`; do not create a
duplicate fixture fix unless the implementation pass proves the checked-out
fixture is still wrong. The widget-local code work remains the missing
route/view-all truthfulness.

## Regression Test Shape

- The current audit inventory is asserted to resolve to a page with a Posts Feed
  block and public HTTP 200 route, or the fixture is repaired if that assertion
  fails.
- Missing detail/list routes produce clear editor/runtime guidance.
- `View all` hidden states are distinguishable from normal disabled state.

## Security Contract

No new public write route. If fixture/bootstrap route data changes, keep routes
safe-relative and do not add arbitrary external navigation defaults.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_POSTS_FEED_WIDGET.md`.
- Update `_docs/_WIDGETS/POSTS_FEED.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Posts Feed deep audits target a valid Posts Feed fixture and public route.
- Missing route configuration is explicit instead of making links disappear
  without context.

## Completion Notes (2026-05-30)

- The checked-out smoke inventory already points Posts Feed to
  `/posts-feed-test-page` for both admin and public fixtures. No fixture rewrite
  was needed; a Bun regression test now asserts that the inventory does not
  point to the stale listing-filters page or missing `/test-posts-feed-0516`
  route.
- Posts Feed now owns `resolvePostsFeedRouteState`, which classifies card/detail
  link readiness, missing list/detail route state, missing View all
  destinations, and all-items-visible View all states.
- The shared Content List renderer now supports an explicit
  `linkUnavailableReason="missing-route"` mode. Posts Feed opts into that mode
  when route state says card/detail links are unavailable, so href-less cards
  render `data-content-list-link-unavailable` copy and disabled CTA labels use
  `data-content-list-cta-disabled="missing-route"` without forcing route copy
  onto generic href-less Content List items.
- `view-all` no longer disappears silently when neither a selected destination
  nor a resolved list path exists; it renders a disabled explanatory state with
  `data-content-list-view-all-unavailable`.
- Posts Feed Visual/Advanced now explain route consequences before publication:
  card titles/CTAs render as non-links without a posts route, View all is hidden
  without a destination/list route, and all-visible feeds explain why the action
  may be redundant.

## Validation Executed (2026-05-30)

- `bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-19
  drift review: no blockers)
