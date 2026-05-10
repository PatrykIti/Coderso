# TASK-252-07-02: Posts Feed Source Density Author Date and Category

# FileName: TASK-252-07-02_Posts_Feed_Source_Density_Author_Date_and_Category.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Expose posts-feed latest/category/featured/manual sources, density, author/date/category visibility, and CTA copy while leaving infinite feeds out of scope.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/posts-feed/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/posts-feed/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/posts-feed/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/posts-feed/MATRIX.md`; for this leaf, start from the current owner fields `source`, `fields`, `emptyState`, `style`, `resolved` and add only the schema fields that the matrix explicitly keeps.
- Keep: latest/category/featured/manual source modes, current card/list/compact
  density variants, and author/date/category toggles from
  `_docs/_WIDGETS/tmp/posts-feed/MATRIX.md`; add schema-owned source and
  density controls in `core/widgets/core/postsFeed.tsx`.
- Adapt: reading time remains conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `posts-feed`.
- `Visual`: `Source`, `Display density`, `Metadata visibility`, `CTA`, `Empty state`.
- `Advanced`: `Resolver diagnostics`, `Legacy source mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/postsFeed.tsx`
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/unit/widgets/postsFeedWidget.test.tsx`
- `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/_WIDGETS/tmp/posts-feed/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-02_Posts_Feed_Source_Density_Author_Date_and_Category.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizePostsFeedData(data: PostsFeedData): PostsFeedData {
  return {
    source: normalizePostsFeedSource(data.source),
    fields: normalizePostsFeedFields(data.fields),
    emptyState: normalizePostsFeedEmptyState(data.emptyState),
    style: normalizePostsFeedStyle(data.style),
    resolved: normalizePostsFeedResolved(data.resolved),
  };
}

function PostsFeedVisualEditor(props: WidgetEditorProps<PostsFeedData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="posts-feed.source" title="Source">
      <WidgetControlRow id="posts-feed.source.mode" label="Source mode" data-widget-control="posts-feed.source.mode">
        <Select value={value.source?.mode ?? "latest"} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/posts-feed/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/postsFeed.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `posts-feed` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `posts-feed` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/postsFeed.tsx`.
- Anti-abuse:
  - post visibility must respect existing published-status resolver behavior
  - limits and category filters must remain clamped and schema-owned

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-02_Posts_Feed_Source_Density_Author_Date_and_Category.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `posts-feed` editor exposes the research-backed controls named in this leaf with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
