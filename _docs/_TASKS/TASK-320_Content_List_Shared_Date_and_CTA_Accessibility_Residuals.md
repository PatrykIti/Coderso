# TASK-320: Content List Shared Date and CTA Accessibility Residuals

# FileName: TASK-320_Content_List_Shared_Date_and_CTA_Accessibility_Residuals.md

**Priority:** High
**Category:** Widgets + Accessibility + Shared Renderer
**Estimated Effort:** Large
**Dependencies:** TASK-302, TASK-262, TASK-277
**Status:** To Do

---

## Overview

Repair the shared `ContentListBlock` accessibility residuals that still affect
both `content-list` and `posts-feed` after TASK-302:

- semantic date output (`BUG-08` / `A1` from the Posts Feed report),
- contextual CTA link text for screen readers (`A3` from the Posts Feed report).

This task must stay shared. Do not patch these behaviors only in
`core/widgets/core/postsFeed.tsx`.

## Source Findings

- `ContentListBlock` still renders runtime dates through
  `toISOString().slice(0, 10)`:
  `core/widgets/core/contentList.tsx:616-621`.
- The meta row is plain text and does not emit `<time datetime="...">`:
  `core/widgets/core/contentList.tsx:635-645,735`.
- CTA links still render the visible label only:
  `core/widgets/core/contentList.tsx:741-745`.
- Shared `ContentListBlock` output is consumed by both `content-list` and
  `posts-feed`:
  `_docs/_WIDGETS/CONTENT_LIST.md:176`,
  `core/widgets/core/postsFeed.tsx:385-405`.
- Posts Feed report rows route here instead of reopening closed TASK-256
  classification docs:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:169-174,257,259,275`.

## Sub-Tasks

- None. This is an execution task.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contentList.tsx` | Emit human-readable dates through a shared formatter, render `<time datetime="...">` when a valid runtime date exists, and add contextual CTA accessibility text without changing visible label copy. |
| `tests/unit/widgets/contentList.test.tsx` | Cover semantic date output, invalid-date fallback, and contextual CTA text for linked/fallback CTA states. |
| `tests/vitest/site/publicRenderer.test.tsx` | Cover final public HTML markers/output for both content-list and posts-feed consumers if rendered HTML changes. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Update only if shared output assertions become part of Posts Feed render coverage. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Document the shared semantic date and CTA accessibility contract. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Update only if the visible shared output changes Posts Feed-facing behavior. |
| `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` | Refresh shared residual status if the Content List report references these behaviors. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Mark `BUG-08`, `A1`, and `A3` as fixed by TASK-320 once implemented. |

## Implementation Pseudocode

```tsx
function formatRuntimeDateParts(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    iso: parsed.toISOString(),
    label: new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(parsed),
  };
}

function renderMetaDate(item: ContentListRuntimeItem) {
  const parts = formatRuntimeDateParts(item.publishedAt);
  if (!parts) return null;
  return <time dateTime={parts.iso}>{parts.label}</time>;
}

function resolveCtaAriaLabel(item: ContentListRuntimeItem, visibleLabel: string) {
  const title = item.title?.trim();
  return title ? `${visibleLabel}: ${title}` : visibleLabel;
}
```

Error handling:

- Invalid or missing runtime dates must omit the `<time>` element instead of
  emitting broken or misleading markup.
- CTA accessibility text must remain deterministic; if the title is missing,
  fall back to the visible CTA label.
- Do not change route ownership, safe href behavior, or public-write semantics.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged because this task only changes shared
  render semantics.
- Anti-abuse: preserve existing safe href handling; do not emit unsanitized HTML
  or unsafe URLs.
- Secret handling: no private data in public DOM, docs, or tests.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/_WIDGETS/POSTS_FEED.md` only if visible shared behavior changes
- `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md`
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-320_Content_List_Shared_Date_and_CTA_Accessibility_Residuals.md`

## Acceptance Criteria

- Shared content-list and posts-feed cards render semantic `<time>` markup with
  readable date text when a valid runtime date exists.
- Shared CTA links expose contextual accessible naming without changing visible
  CTA label copy.
- Invalid dates remain safely omitted rather than emitting broken semantics.
- Both shared renderer tests and public renderer tests cover the final behavior.
