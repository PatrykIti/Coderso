# TASK-252-07-01: Content List Source Display Field Visibility and Empty States

# FileName: TASK-252-07-01_Content_List_Source_Display_Field_Visibility_and_Empty_States.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Refine content-list source, status/sort/limit, display density, featured-first behavior, field visibility, and empty/error states without introducing template fragments.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/content-list/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/content-list/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/content-list/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: source/type selection, status scope, sort, limit, card/list/compact
  display modes, density/columns, image/excerpt/meta/CTA/taxonomy field
  visibility, and empty/error states from
  `_docs/_WIDGETS/tmp/content-list/MATRIX.md`; start from the current owner
  fields `source`, `filters`, `fields`, `emptyState`, `style`, and `resolved`.
- Adapt: featured-first editorial ordering and pagination/infinite load remain
  conditional; implement only when schema/defaults/normalizer/render/editor/
  tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `content-list`.
- `Visual`: `Source`, `Filters and limit`, `Display`, `Field visibility`, `States`.
- `Advanced`: `Query diagnostics`, `Legacy source mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/contentList.tsx`
- `core/admin/ui/widgets/editors/ContentListEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/unit/widgets/contentList.test.tsx`
- `tests/vitest/ui/content-list-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/_WIDGETS/tmp/content-list/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-01_Content_List_Source_Display_Field_Visibility_and_Empty_States.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeContentListData(data: ContentListData): ContentListData {
  return {
    source: normalizeContentListSource(data.source),
    filters: normalizeContentListFilters(data.filters),
    fields: normalizeContentListFields(data.fields),
    emptyState: normalizeContentListEmptyState(data.emptyState),
    style: normalizeContentListStyle(data.style),
    resolved: normalizeContentListResolved(data.resolved),
  };
}

function ContentListVisualEditor(props: WidgetEditorProps<ContentListData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="content-list.source" title="Source">
      <WidgetControlRow id="content-list.source.mode" label="Source mode" data-widget-control="content-list.source.mode">
        <Select value={value.source?.mode ?? "legacy"} onChange={(mode) => props.onChange(updateContentListSource(value, { mode }))} />
      </WidgetControlRow>
      <WidgetControlRow id="content-list.fields.showMeta" label="Show meta" data-widget-control="content-list.fields.showMeta">
        <Switch checked={value.fields?.showMeta ?? true} onCheckedChange={(showMeta) => props.onChange(updateContentListFields(value, { showMeta }))} />
      </WidgetControlRow>
      <WidgetControlRow id="content-list.emptyState.title" label="Empty title" data-widget-control="content-list.emptyState.title">
        <Input value={value.emptyState?.title ?? ""} onChange={(title) => props.onChange(updateContentListEmptyState(value, { title }))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/content-list/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/contentList.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/ContentListEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `content-list` output is public page/runtime output.
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
  - changed `content-list` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/contentList.tsx`.
- Anti-abuse:
  - source selection must not expose data beyond existing runtime resolver permissions
  - limits must remain clamped and query fields schema-owned

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-01_Content_List_Source_Display_Field_Visibility_and_Empty_States.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `content-list` editor exposes the research-backed controls named in this leaf with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
