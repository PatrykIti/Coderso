# TASK-336-04: Template Section Mode Ownership

# FileName: TASK-336-04_Template_Section_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Template Section + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03
**Status:** To Do

---

## Overview

Split `template-section` into truthful `Wizard`, `Visual`, and `Advanced`
owners instead of rendering the same editor surface in every mode.

This is a P0 widget because the current UX makes mode labels meaningless:
authors see the same writable template controls regardless of selected mode.
The fix must create a clear first-time setup path while keeping daily work and
technical diagnostics separate.

## Ownership Decision

- `Wizard` owns template selection, required template-type setup, and first-use
  guidance.
- `Visual` owns public-facing presentation of the selected template section,
  including label/copy/surface controls if they exist.
- `Advanced` owns resolved template diagnostics, internal ids, version/source
  summaries, and read-only payload previews.

## Sub-Tasks

- [ ] Audit the current `TemplateSectionEditor` and all paths it mutates.
- [ ] Add an explicit `editorContract` entry for `template-section`.
- [ ] Split the shared editor into mode-specific sections.
- [ ] Move all writable setup paths into Wizard.
- [ ] Move all daily visual/presentation paths into Visual.
- [ ] Convert Advanced duplicate controls into read-only summaries.
- [ ] Add empty/missing template state copy that explains the next action.
- [ ] Add Vitest UI assertions for mode-specific ownership.
- [ ] Add Playwright smoke coverage or mark the frontend fixture gap explicitly
  until a public fixture page exists.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/templateSection.tsx` | Add or update `editorContract`; preserve schema/default/normalize behavior. |
| `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` | Split Wizard/Visual/Advanced rendering and use shared section/control primitives. |
| `tests/vitest/widgets/templateSection.test.tsx` | Cover contract/schema normalization if touched. |
| `tests/vitest/ui/template-section-editor-wave.test.tsx` | Add mode ownership and no-duplicate assertions. |
| `_docs/_WIDGETS/TEMPLATE_SECTION.md` | Document final editor ownership if the widget doc exists or is created. |

## Implementation Pseudocode

```tsx
function TemplateSectionWizardEditor(props: WidgetEditorProps<TemplateSectionData>) {
  return (
    <WidgetEditorModeRoot mode="wizard" widgetType="template-section">
      <WidgetEditorSection mode="wizard" sectionId="template-setup" role="setup" title="Template setup">
        <WidgetControlRow path="templateId">
          <TemplatePicker value={props.value.templateId} onChange={updateTemplateId} />
        </WidgetControlRow>
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}

function TemplateSectionAdvancedEditor(props: WidgetEditorProps<TemplateSectionData>) {
  return (
    <WidgetEditorModeRoot mode="advanced" widgetType="template-section">
      <WidgetEditorSection mode="advanced" sectionId="resolved-template" role="diagnostics" title="Resolved template">
        <ReadonlyWidgetSummaryRow path="templateId" value={props.value.templateId} />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
```

Data flow:

- The existing normalized widget data remains the single source of truth.
- Wizard mutates only setup/source paths.
- Visual mutates only public presentation paths.
- Advanced receives the normalized value and renders read-only summaries.

Error handling:

- Missing template id should render guidance, not an empty Advanced payload.
- Invalid legacy ids should normalize safely and show a read-only diagnostic.
- Do not add public rendering fallbacks only to satisfy tests.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve existing widget schema validation.
- Anti-abuse: no public write changes.
- Secret handling: template diagnostics must not expose private draft payloads
  beyond what the admin user is already authorized to see.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/template-section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/templateSection.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `template-section` admin modes.

Regression-test shape:

- Wizard renders `template-setup` and owns `templateId`.
- Visual does not render a duplicate writable `templateId` picker.
- Advanced shows resolved template information as read-only.
- No writable path appears in more than one mode.

## Documentation Updates Required

- Update the Template Section widget doc with mode ownership.
- Update `_docs/PLAYWRIGHT/REPORT_WIDGET_CONTRACT_REAUDIT_2026_05_23.md` when
  the P0 finding is fixed.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- `template-section` no longer renders the same editor in all three modes.
- Every section/control uses the shared DOM metadata contract.
- Tests prove Wizard setup ownership and Advanced read-only diagnostics.

