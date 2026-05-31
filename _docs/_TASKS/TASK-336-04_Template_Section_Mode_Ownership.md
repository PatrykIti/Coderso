# TASK-336-04: Template Section Mode Ownership

# FileName: TASK-336-04_Template_Section_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Template Section + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03
**Status:** Done (2026-05-24)

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
- `Advanced` owns resolved template diagnostics, version/source summaries, and
  read-only content summaries without exposing raw JSON payloads or internal ids
  in the normal UI.

Current TASK-336-03 smoke evidence confirmed the widget after implementation:
targeted admin smoke for `template-section` passed with `adminFailures=0` and
`metadataGaps=0` on 2026-05-24. TASK-336-19 later supersedes this with durable
Visual/Advanced plus public fixture evidence for `/ctr-template-section-2305`
under `_docs/PLAYWRIGHT/`.

## Sub-Tasks

- [x] Audit the current `TemplateSectionEditor` and all paths it mutates.
- [x] Add an explicit `editorContract` entry for `template-section`.
- [x] Split the shared editor into mode-specific sections.
- [x] Move all writable setup paths into Wizard.
- [x] Move all daily visual/presentation paths into Visual.
- [x] Convert Advanced duplicate controls into read-only summaries.
- [x] Add empty/missing template state copy that explains the next action.
- [x] Add Vitest UI assertions for mode-specific ownership.
- [x] Publish a public test fixture page for `template-section` or document why
  the widget remains admin-only; record the URL or deferral in the smoke
  inventory.
- [x] Add Playwright smoke coverage for admin modes and the public fixture
  decision.

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
- Append a dated TASK-336-04 status note to
  `_docs/PLAYWRIGHT/REPORT_WIDGET_CONTRACT_REAUDIT_2026_05_23.md` or leave the
  source evidence stable and link the final superseding report from
  TASK-336-17.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- `template-section` no longer renders the same editor in all three modes.
- Every section/control uses the shared DOM metadata contract.
- Tests prove Wizard setup ownership and Advanced read-only diagnostics.

## Completion Notes

Completed on 2026-05-24.

Final ownership:

- `Wizard` owns template setup through `templateId` and derived `templateName`.
- `Visual` owns presentation metadata (`metadata.previewLabel`,
  `metadata.category`) and shows the active template as a summary.
- `Advanced` is read-only diagnostics/content summary for template selection,
  template name, metadata version, resolved block count/types, and
  human-readable resolution errors.

Validation:

- `bun run test:vitest -- tests/vitest/ui/template-section-editor-wave.test.tsx tests/vitest/widgets/templateSection.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Historical TASK-336-04 admin-only smoke is superseded by the durable
  TASK-336-19 strict Visual/Advanced/public fixture evidence below.

TASK-336-19 supersession on 2026-05-25:

- `Advanced` no longer renders a raw JSON payload preview, raw template ids, or
  resolver error codes; it shows human summaries.
- Selecting or clearing a template explicitly clears stale `resolved` payloads.
- Runtime prioritizes resolution errors over stale resolved blocks and renders a
  safe placeholder for errored template references.
- Durable strict Playwright evidence is now stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-template-section-advanced-readonly-2026-05-25.*`
  and includes the public fixture path.
