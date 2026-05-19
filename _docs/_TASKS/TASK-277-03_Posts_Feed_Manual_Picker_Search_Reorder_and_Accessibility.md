# TASK-277-03: Posts Feed Manual Picker Search, Reorder, and Accessibility

# FileName: TASK-277-03_Posts_Feed_Manual_Picker_Search_Reorder_and_Accessibility.md

**Priority:** High
**Category:** Widgets + Posts Feed + Admin UI + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-277, TASK-277-01
**Status:** Done (2026-05-19)

---

## Overview

Improve the Posts Feed manual selection experience without implementing global
auth/session repair inside the widget.

This leaf owns search, selected-order management, accessible checkbox/live
region semantics, and local retry/re-auth copy for picker failures.

## Source Findings

- BUG-09 local picker failure state:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:176-180,298,346`.
- UX-04 manual picker search:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:197-199,306`.
- UX-05 drag-and-drop/manual reorder:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:201-203,307`.
- A5/A6 manual picker accessibility:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:261-262`.
- Current picker fetches posts once and renders a scrollable checkbox list:
  `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:142-177,251-303`.
- Current manual order is persisted through `source.manualPostIds`:
  `core/widgets/core/postsFeed.tsx:75-88,257-263`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Add search, retry, selected-list ordering controls, accessible labels, and loading/error `aria-live`. |
| `core/widgets/core/postsFeed.tsx` | Update normalizer only if reorder helpers require stricter limits or diagnostics. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover search, select/deselect, selected order changes, retry/error copy, labels, and live-region behavior. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Keep/manual-order regression if normalizer behavior changes. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document manual selection behavior and auth-error boundary. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Mark local picker UX/accessibility findings fixed and leave global auth refresh out of scope. |

## Implementation Pseudocode

```tsx
function ManualPostPicker({ posts, selectedIds, onSelectedIdsChange, loading, error }) {
  const [query, setQuery] = useState("");
  const filtered = filterPosts(posts, query);

  return (
    <div>
      <input aria-label="Search posts for manual selection" value={query} />
      <p aria-live="polite">{loading ? "Loading posts..." : error ?? ""}</p>
      {selectedIds.map((id, index) => (
        <SelectedPostRow
          key={id}
          canMoveUp={index > 0}
          canMoveDown={index < selectedIds.length - 1}
          onMoveUp={() => moveSelected(id, -1)}
          onMoveDown={() => moveSelected(id, 1)}
        />
      ))}
      {filtered.map((post) => (
        <label key={post.id}>
          <input aria-label={`Select ${post.title}`} type="checkbox" />
          {post.title}
        </label>
      ))}
    </div>
  );
}
```

Error handling:

- On 401/403, show a local message that the post catalog needs a fresh admin
  session, and expose a retry action. Do not silently pretend the catalog is
  empty.
- Preserve selected IDs even when the catalog fails to load.
- Reorder controls must not drop unknown legacy IDs that are still stored in the
  widget payload.

## Security Contract

No new API routes are added.

- Endpoint visibility: existing internal admin `GET /api/posts` only.
- Auth model: existing authenticated admin session.
- RBAC: existing post-read permissions.
- CSRF: unchanged; do not add a widget-local CSRF refresh workaround.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged unless normalizer diagnostics are added.
- Anti-abuse: search is local over fetched post summaries; do not expose hidden
  fields, tokens, or private post bodies.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx` if normalizer/order
  behavior changes.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-277-03_Posts_Feed_Manual_Picker_Search_Reorder_and_Accessibility.md`

## Acceptance Criteria

- Manual picker search filters the visible catalog without changing stored
  selection.
- Selected posts can be reordered with keyboard-accessible controls, with drag
  support optional only if it does not weaken accessibility.
- Loading/error feedback is announced through `aria-live`.
- Checkbox labels include the post title.
- A 401/403 catalog response is actionable and is not rendered as "No posts
  available" without context.
