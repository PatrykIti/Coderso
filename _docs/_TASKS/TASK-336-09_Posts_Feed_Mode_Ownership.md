# TASK-336-09: Posts Feed Mode Ownership

# FileName: TASK-336-09_Posts_Feed_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Posts Feed + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03
**Status:** Done (2026-05-24)

---

## Overview

Separate Posts Feed source/display ownership and remove duplicate Visual
controls from Advanced.

Posts Feed is a P1 risk because source selection, item count, card display, and
preview diagnostics can collapse into overlapping controls. The final editor
must keep source setup understandable while preventing Advanced from becoming a
second display editor.

## Ownership Decision

- `Wizard` owns feed source, collection/post-type choice, initial count, and
  first-time setup guidance.
- `Visual` owns card layout, metadata visibility, image/copy presentation,
  spacing, pagination/load-more presentation, and empty-state copy.
- `Advanced` owns read-only resolved query, data freshness, cache/runtime
  diagnostics, and source capability summaries.

Evidence caveat: the re-audit finding is source-backed, not a completed
38-widget browser traversal. TASK-336-03 admin smoke must confirm this widget
before the task can move to Done.

## Sub-Tasks

- [x] Inventory Posts Feed source, display, and runtime paths.
- [x] Add or update `posts-feed` `editorContract` metadata.
- [x] Move feed source setup into Wizard.
- [x] Keep card/display presentation in Visual.
- [x] Convert Advanced source/display duplicates into read-only diagnostics.
- [x] Preserve preview behavior and empty-feed guidance.
- [x] Add Vitest UI coverage for source/display split.
- [x] Add Playwright admin/public smoke coverage with non-empty fixture data.

## Status Notes

- 2026-05-24: Completed. `posts-feed` now exposes a strict v2
  `editorContract`, Wizard owns source/query setup, Visual owns display,
  section chrome, layout/style, pagination presentation, and empty state, and
  Advanced is read-only query/runtime/payload diagnostics plus contract summary.
- 2026-05-24: Preview hydration was moved behind a non-writable preview bridge
  so Visual keeps live preview updates without re-owning `source.*` controls.
- 2026-05-24: Lifecycle caveat: this task is an ownership cleanup only. Wizard
  remains visible as a normal editor tab until `TASK-336-16` ships the one-time
  Wizard lifecycle and `Run setup again` affordance.
- 2026-05-24: Targeted Vitest UI/contract and Bun widget/runtime coverage passed
  locally before Playwright smoke.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/postsFeed.tsx` | Add/update `editorContract`; preserve runtime query behavior. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Split Wizard/Visual/Advanced ownership and metadata. |
| `tests/vitest/widgets/postsFeed.test.tsx` | New focused widget contract/runtime suite if Posts Feed needs pure widget coverage beyond existing preview/editor tests. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover mode ownership and Advanced read-only diagnostics. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document final mode ownership. |

## Implementation Pseudocode

```tsx
function PostsFeedAdvancedEditor({ value }: WidgetEditorProps<PostsFeedData>) {
  const summary = resolvePostsFeedQuerySummary(value);
  return (
    <WidgetEditorModeRoot mode="advanced" widgetType="posts-feed">
      <WidgetEditorSection mode="advanced" sectionId="resolved-query" role="diagnostics" title="Resolved query">
        <ReadonlyWidgetSummaryRow label="Source" value={summary.sourceLabel} />
        <ReadonlyWidgetSummaryRow label="Limit" value={String(summary.limit)} />
        <ReadonlyWidgetSummaryRow label="Ordering" value={summary.orderLabel} />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
```

Data flow:

- Wizard sets query/source inputs.
- Visual sets display inputs.
- Advanced derives and displays resolved query data.
- Public renderer executes the existing normalized query contract.

Error handling:

- Empty source should show setup guidance instead of a broken preview.
- Query summaries must not expose private drafts beyond admin authorization.
- Do not add cache or runtime fallbacks solely for tests.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve widget schema.
- Anti-abuse: no public write changes.
- Secret handling: do not expose private draft content or privileged query
  details in public artifacts.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-posts-feed-preview.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx` when runtime/query
  behavior or the existing Bun-owned widget contract changes.
- `bun run test:vitest -- tests/vitest/widgets/postsFeed.test.tsx` if this task
  creates the new pure widget suite listed above.
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `posts-feed` admin modes and public fixture.

Regression-test shape:

- Wizard owns source/count setup.
- Visual owns card/display settings.
- Advanced shows read-only query diagnostics.
- No source/display path is duplicated across modes.

## Documentation Updates Required

- Update Posts Feed widget docs.
- Append a dated TASK-336-09 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Posts Feed has a clear source/display/diagnostic split.
- Advanced does not duplicate daily card/display controls.
- Public fixture data proves frontend rendering is not empty or misleading.
