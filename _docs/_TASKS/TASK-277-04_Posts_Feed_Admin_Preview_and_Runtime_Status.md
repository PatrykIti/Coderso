# TASK-277-04: Posts Feed Admin Preview and Runtime Status

# FileName: TASK-277-04_Posts_Feed_Admin_Preview_and_Runtime_Status.md

**Priority:** High
**Category:** Widgets + Posts Feed + Admin Preview + Runtime Data
**Estimated Effort:** Large
**Dependencies:** TASK-277, TASK-277-01, TASK-277-02, TASK-277-03
**Status:** To Do

---

## Overview

Make Posts Feed preview truthful in the page builder while keeping persisted
widget data server-owned.

The admin canvas currently renders an empty state because the public SSR
resolver is not run client-side. This leaf adds a preview-only hydration path
using existing admin post catalog reads and a user-readable runtime status.

## Source Findings

- UX-01 admin canvas always shows "No posts found":
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:184-187,270-279,304`.
- UX-06 resolver status is only raw JSON in Advanced:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:205-207`.
- Runtime payload is currently a raw read-only Advanced section:
  `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:602-614`.
- Public SSR hydration currently happens in `core/server/publicSite.tsx` through
  `resolvePostsFeedRuntimeData`; admin preview must not persist fake `resolved`
  payloads.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Add readable preview/runtime status and reuse picker/catalog state where possible. |
| Page-builder/admin preview owner discovered during implementation | Hydrate selected Posts Feed blocks with preview-only `resolved.items` without writing them into saved page data. |
| `core/widgets/core/postsFeed.tsx` | Add preview-safe diagnostics only if needed by the renderer. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover visible runtime status and no raw-only status dependency. |
| Relevant page-builder Vitest test | Cover admin canvas preview showing sample posts and not persisting preview-only payloads. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover mapping if preview diagnostics change. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document admin preview vs public SSR behavior. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Mark UX-01/UX-06 fixed/deferred with evidence. |

## Implementation Pseudocode

```ts
type PostsFeedPreviewState = {
  items: ContentListRuntimeItem[];
  total: number;
  resolvedAt: string;
  sourceMode: PostsFeedSourceMode;
  error?: string;
};

async function resolvePostsFeedAdminPreview(data: PostsFeedData, posts: PostSummary[]) {
  const normalized = normalizePostsFeedData(data);
  return mapPostSummariesToPostsFeedRuntime(normalized, posts, {
    preview: true,
    routeContext: "admin-preview",
  });
}

function applyPreviewResolvedData(block: WidgetBlock, preview: PostsFeedPreviewState) {
  return {
    ...block,
    data: {
      ...block.data,
      resolved: preview,
    },
  };
}
```

Error handling:

- Never save preview-only `resolved` data through the page update payload.
- If post catalog fetch fails, render a clear preview warning and keep the public
  runtime contract unchanged.
- Abort stale async preview requests when the block/source changes.

## Security Contract

No new API routes are required by default.

- Endpoint visibility: existing internal admin post-read APIs only.
- Auth model: authenticated admin session.
- RBAC: existing post-read and page-builder permissions.
- CSRF: unchanged for existing admin reads/writes.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: persisted widget schema must not accept preview-only
  fields outside `data.resolved`.
- Anti-abuse: preview data must be bounded by the same limit and field controls
  as public runtime data.
- Secret handling: preview status must not expose tokens, private URLs, or raw
  auth errors.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- Add/run the focused page-builder/admin preview Vitest suite for the owner file
  discovered during implementation.
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-277-04_Posts_Feed_Admin_Preview_and_Runtime_Status.md`

## Acceptance Criteria

- Admin canvas can show representative Posts Feed cards when posts exist.
- Saved page data does not persist preview-only resolved payloads.
- Editor status shows readable sync/preview information instead of forcing users
  to inspect raw Advanced JSON.
- Failed preview hydration is visible, bounded, and does not overwrite dirty
  widget data.
