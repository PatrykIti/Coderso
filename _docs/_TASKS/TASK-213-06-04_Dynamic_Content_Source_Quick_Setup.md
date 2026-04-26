# TASK-213-06-04: Dynamic Content Source Quick Setup
# FileName: TASK-213-06-04_Dynamic_Content_Source_Quick_Setup.md

**Priority:** Medium
**Category:** Content Widgets + Admin/UI + Widget Contracts
**Estimated Effort:** Medium
**Dependencies:** TASK-213-06, TASK-213-01-02
**Status:** To Do

---

## Overview

Verify and upgrade the source/count/layout quick setup for dynamic content
widgets from the per-widget audit: Posts Feed, Content List, and Entry Teaser.

Business outcome: editors understand what content source will render, how many
items will show, and which layout variant is active without falling into raw
payload editing.

Technical contract: use each widget's existing schema/default/`normalize*`
owner first. Keep Bun-owned runtime/widget suites in Bun where the production
module imports runtime behavior; add Vitest editor tests only for Bun-free UI
layers.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
- `core/admin/ui/widgets/editors/ContentListEditors.tsx`
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
- `core/widgets/core/postsFeed.tsx`
- `core/widgets/core/contentList.tsx`
- `core/widgets/core/entryTeaser.tsx`
- existing `tests/unit/widgets/postsFeedWidget.test.tsx`
- `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `tests/vitest/widgets/contentList.test.tsx`
- `tests/vitest/ui/content-list-editor-wave.test.tsx`
- `tests/vitest/widgets/entryTeaser.test.tsx`
- `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`

## Implementation Direction

Current-state verification is valid when the checked-out widget already has
clear source/count/layout controls. If not, add bounded controls through the
owner contract.

```tsx
<SourcePicker
  label="Content source"
  value={normalized.source}
  onChange={(source) => update({ source })}
/>
<Input
  label="Visible items"
  type="number"
  min={1}
  max={24}
  value={normalized.limit}
  onChange={(limit) => update({ limit })}
/>
<Select label="Layout" value={normalized.layout} onValueChange={setLayout} />
```

For Listing-backed controls, coordinate with `TASK-213-01-02`: empty state and
loading-state copy must come from the same selector semantics, not a second
source-picker implementation.

## Security Contract

- Visibility: internal admin editor; normalized widget output may render
  publicly.
- Auth model: existing admin session/API-key reads for content/listing/post
  selector data.
- RBAC: existing content/listing/post read permissions.
- CSRF: no write route changes.
- Rate-limit bucket: existing admin read buckets.
- Reject-unknown validation:
  - new source/count/layout fields must be schema-owned and normalized before
    editor exposure.
- Anti-abuse:
  - do not persist raw listing/query/content records in widget JSON;
  - clamp item counts and reject unsafe routes/URLs through existing
    normalizers.

## Testing Requirements

- Posts Feed:
  - keep `tests/unit/widgets/postsFeedWidget.test.tsx` green unless deliberately
    migrated;
  - add a Bun-free UI suite only if the edited component can import without
    runtime coupling.
- Content List and Entry Teaser:
  - widget tests cover source/count/layout normalization;
  - existing UI editor wave tests cover helper copy/current-state verification
    when editor controls change.
- Manual Playwright:
  - add Posts Feed, Content List, and Entry Teaser;
  - verify source/count/layout choices are understandable or record an explicit
    source-report deferral with owner and reason.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/_WIDGETS/ENTRY_TEASER.md`

## Acceptance Criteria

1. Dynamic content widgets expose or explicitly verify clear source/count/layout
   quick setup.
2. Stored payloads remain schema-owned and deterministic.
3. Bun/Vitest test ownership follows the current import/runtime shape.
