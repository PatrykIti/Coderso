# TASK-252-06-10: Rich Text Section Prose Presets Width Badge and CTA

# FileName: TASK-252-06-10_Rich_Text_Section_Prose_Presets_Width_Badge_and_CTA.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-06
**Status:** To Do

---

## Overview

Improve rich-text-section with safe prose presets, width, heading/body/CTA, and badge/eyebrow first; quote/media and editorial layouts stay Adapt-only with no raw HTML expansion.

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

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/rich-text-section/MATRIX.md`; for this leaf, start from the current owner fields `titleBlock`, `body`, `options`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: safe prose presets, heading/body/CTA section, constrained article
  width, and badge/eyebrow from `_docs/_WIDGETS/tmp/rich-text-section/MATRIX.md`;
  reuse the existing `titleBlock.eyebrow` field for badge/eyebrow instead of
  adding a duplicate field, and add schema-owned safe CTA fields in
  `core/widgets/core/richTextSection.tsx`.
- Adapt: media-adjacent content, multi-column prose, and pull quote remain conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `rich-text-section`.
- `Visual`: `Content`, `Prose preset`, `Width`, `Badge and CTA`.
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
function normalizeRichTextSectionData(data: RichTextSectionData): RichTextSectionData {
  return {
    titleBlock: normalizeRichTextSectionTitleBlock(data.titleBlock),
    body: normalizeRichTextSectionBody(data.body),
    cta: normalizeRichTextSectionCta(data.cta),
    options: normalizeRichTextSectionOptions(data.options),
    style: normalizeRichTextSectionStyle(data.style),
  };
}

function RichTextSectionVisualEditor(props: WidgetEditorProps<RichTextSectionData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="rich-text-section.options" title="Prose and width">
      <WidgetControlRow id="rich-text-section.options.maxWidth" label="Max width" data-widget-control="rich-text-section.options.maxWidth">
        <Select value={value.options?.maxWidth ?? "lg"} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="rich-text-section.titleBlock.eyebrow" label="Badge" data-widget-control="rich-text-section.titleBlock.eyebrow">
        <Input value={value.titleBlock?.eyebrow ?? ""} onChange={(eyebrow) => props.onChange(updateRichTextTitleBlock(value, { eyebrow }))} />
      </WidgetControlRow>
      <WidgetControlRow id="rich-text-section.cta.label" label="CTA label" data-widget-control="rich-text-section.cta.label">
        <Input value={value.cta?.label ?? ""} onChange={(label) => props.onChange(updateRichTextCta(value, { label }))} />
      </WidgetControlRow>
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
  - Link fields introduced or touched by this leaf must normalize through a
    leaf-owned safe-href normalizer, or a shared helper extracted with tests in
    the same implementation slice, before render; media fields must stay on the
    existing media-picker/storage ownership path when one exists; raw URL media
    fields must add bounded sanitization and tests before render.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
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
