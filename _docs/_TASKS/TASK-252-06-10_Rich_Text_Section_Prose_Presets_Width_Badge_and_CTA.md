# TASK-252-06-10: Rich Text Section Prose Presets Width Badge and CTA

# FileName: TASK-252-06-10_Rich_Text_Section_Prose_Presets_Width_Badge_and_CTA.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-06
**Status:** To Do

---

## Overview

Improve rich-text-section with safe prose presets, width, badge, CTA, quote/media support, and no raw HTML expansion.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/rich-text-section/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/rich-text-section/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/rich-text-section/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: prose presets, width, badge, CTA, safe quote/media support.
- Adapt: quote/media as schema-owned structured fields.
- Reject: raw HTML and arbitrary sanitizer bypasses.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `rich-text-section`.
- `Visual`: `Content`, `Prose preset`, `Width`, `Badge and CTA`, `Quote/media`.
- `Advanced`: `Sanitizer diagnostics`, `Legacy content mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/richTextSection.tsx`
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/vitest/widgets/richTextSection.test.tsx`
- `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/_WIDGETS/tmp/rich-text-section/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-10_Rich_Text_Section_Prose_Presets_Width_Badge_and_CTA.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeRichTextSectionItem(raw: unknown, index: number) {
  return {
    id: normalizeStableId(raw.id, `rich-text-section-${index + 1}`),
    title: readTrimmedString(raw.title),
    href: normalizeSafeHref(raw.href),
  };
}

function RichTextSectionVisualEditor(props: WidgetEditorProps<RichTextSectionData>) {
  return (
    <WidgetEditorSection id="rich-text-section.items" title="Prose preset">
      {props.value.items.map((item, index) => (
        <WidgetControlRow key={item.id} id={`rich-text-section.items.${index}.title`} label="Title">
          <Input value={item.title} onChange={...} />
        </WidgetControlRow>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/rich-text-section/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/richTextSection.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `rich-text-section` output is public page/runtime output.
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
  - changed `rich-text-section` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/richTextSection.tsx`.
- Anti-abuse:
  - Link and media fields must keep existing safe URL/media validation.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-10_Rich_Text_Section_Prose_Presets_Width_Badge_and_CTA.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `rich-text-section` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
