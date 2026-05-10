# TASK-252-05-02: Template Section Metadata Preview and Sync

# FileName: TASK-252-05-02_Template_Section_Metadata_Preview_and_Sync.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-05
**Status:** To Do

---

## Overview

Treat template-section as a reusable template reference with metadata and preview
state first. Category, preview label, and version metadata are Keep scope from
the matrix; sync/detach controls remain out of scope unless a reusable-template
service/runtime owner is added first.

This is an execution leaf under `TASK-252-05`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/template-section/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/template-section/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/template-section/MATRIX.md` as the binding research evidence for the final option set.
- Consume shared TASK-252 editor sections, rows, labels, info tips, and `data-widget-control` metadata from TASK-252-01; do not create a widget-local control framework.
- Keep schema/default/normalizer/render/editor/docs changes together and preserve existing saved payload compatibility.
- Keep layout choices beginner-readable through presets and bounded tokens rather than arbitrary CSS controls.

## Research Decisions

- Keep: template id, category, preview label, version metadata, and typed block
  data from `_docs/_WIDGETS/tmp/template-section/MATRIX.md`; start from
  `templateId`, `templateName`, and `resolved`, then add schema-owned metadata
  fields in `core/widgets/core/templateSection.tsx`.
- Adapt: gallery previews and AI prompt hints remain conditional; implement
  only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate widgets per pattern and unconditional sync/detach state before runtime/service ownership exists.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `template-section`.
- `Visual`: `Template reference`, `Preview and metadata`, `Display options`.
- `Advanced`: `Version diagnostics`, `Reusable-template source trace`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/templateSection.tsx`
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if slot or shared renderer output changes.
- `tests/unit/widgets/validator.test.ts` when schema validation or slot normalization changes.
- `tests/vitest/widgets/templateSection.test.tsx`
- `tests/vitest/ui/template-section-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TEMPLATE_SECTION.md`
- `_docs/_WIDGETS/tmp/template-section/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-05-02_Template_Section_Metadata_Preview_and_Sync.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeTemplateSectionData(data: TemplateSectionData): TemplateSectionData {
  return {
    templateId: normalizeTemplateId(data.templateId),
    templateName: normalizeTemplateName(data.templateName),
    metadata: normalizeTemplateMetadata(data.metadata),
    resolved: normalizeTemplateResolution(data.resolved),
  };
}

function TemplateSectionVisualEditor(props: WidgetEditorProps<TemplateSectionData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="template-section.template" title="Template">
      <WidgetControlRow id="template-section.templateId" label="Template" data-widget-control="template-section.templateId">
        <TemplatePicker
          value={value.templateId ?? ""}
          onChange={(templateId) => props.onChange({ ...value, templateId })}
        />
      </WidgetControlRow>
      <TemplatePreview templateId={value.templateId} resolved={value.resolved} />
    </WidgetEditorSection>
  );
}
```

Sync/detach controls are not part of this leaf unless the implementation first adds an explicit reusable-template owner/service contract. Without that owner, this leaf may show source metadata and preview state only.

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/template-section/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/templateSection.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `template-section` output is public page/runtime output.
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
  - changed `template-section` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/templateSection.tsx`.
- Anti-abuse:
  - No raw class-name interpolation from user-controlled fields.
  - No public write endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/templateSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/template-section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TEMPLATE_SECTION.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-05-02_Template_Section_Metadata_Preview_and_Sync.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `template-section` Visual mode is sectioned, accessible, and metadata-backed.
- Final `template-section` options match Keep/Adapt/Reject decisions from the research matrix.
- Existing saved widget payloads remain backward compatible.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
