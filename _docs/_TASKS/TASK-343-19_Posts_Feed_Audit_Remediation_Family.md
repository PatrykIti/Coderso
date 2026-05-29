# TASK-343-19: Posts Feed Audit Remediation Family

# FileName: TASK-343-19_Posts_Feed_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Posts Feed + Fixture Routing + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

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

- [ ] Repair or replace the audit fixture so the assigned admin page and public
  route both contain the intended Posts Feed widget.
- [ ] Make missing list/detail route consequences explicit for cards, item
  links, and any CTA/read-more affordance.
- [ ] Explain or prevent silent `View all` disappearance when the destination is
  missing or all posts are already visible.
- [ ] Add fixture/route regression coverage so future deep-audit prompts cannot
  point to a non-Posts-Feed page or a public `404`.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Surface route/link and view-all ownership truthfully. |
| `core/widgets/core/postsFeed.tsx` | Keep missing-route card/link output explicit and accessible. |
| Fixture/bootstrap data for widget audit pages | Reconcile Posts Feed admin fixture and public route. |
| `tests/vitest/widgets/postsFeed.test.tsx` | Cover missing-route and view-all visibility semantics. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover editor route guidance and fixture assumptions. |

## Implementation Pseudocode

```ts
function resolvePostsFeedRouteState(settings: SiteRouteSettings, data: PostsFeedData) {
  if (!settings.postsBasePath) return { mode: "missing_detail_route" };
  if (data.viewAll?.enabled && !data.viewAll.href) return { mode: "missing_view_all_destination" };
  return { mode: "ready", basePath: settings.postsBasePath };
}
```

## Regression Test Shape

- The Posts Feed audit fixture resolves to a page with a Posts Feed block and
  public HTTP 200 route.
- Missing detail/list routes produce clear editor/runtime guidance.
- `View all` hidden states are distinguishable from normal disabled state.

## Security Contract

No new public write route. If fixture/bootstrap route data changes, keep routes
safe-relative and do not add arbitrary external navigation defaults.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/postsFeed.test.tsx`
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
