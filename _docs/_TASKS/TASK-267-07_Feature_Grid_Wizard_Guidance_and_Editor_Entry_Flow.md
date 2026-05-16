# TASK-267-07: Feature Grid Wizard Guidance and Editor Entry Flow

# FileName: TASK-267-07_Feature_Grid_Wizard_Guidance_and_Editor_Entry_Flow.md

**Priority:** Medium
**Category:** Widgets + Feature Grid + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-267-02, TASK-267-03, TASK-267-04, TASK-267-05, TASK-267-06
**Status:** To Do

---

## Overview

Refine the Feature Grid Wizard so first-run setup is honest about its limited
scope and decide whether the widget should default to Wizard or Visual after the
expanded Visual editor is complete.

This leaf is Feature Grid-local onboarding work. It must preserve the shared
three-mode widget contract from `_docs/WIDGETS.md`.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:226-228` - UX-05 Wizard edits
  only titles without explaining that Visual has full card editing.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:246-248` - UX-10 first editor
  entry always starts from Wizard and adds a step for common editing.
- `_docs/WIDGETS.md:54-105` - shared Wizard/Visual/Advanced ownership.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add concise Wizard guidance and keep first-run setup minimal. Do not add widget-local tab state. |
| `core/admin/ui/pages/builder/WizardPanel.tsx` | Change only if the shared `onComplete` button label or copy needs to expose a clearer Visual handoff for all widgets. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Change only if product accepts a shared editor-entry policy that can choose initial `editor.mode` / `wizardCompleted` by widget definition. |
| `core/admin/ui/pages/builder/blockUtils.ts` | Change only if a shared, schema-backed initial editor-state helper is added near `createBlock` / `applyWizardSelection`; do not add a Feature Grid-only branch without a shared capability flag. |
| `core/widgets/core/featureGrid.tsx` | Change only if widget definition receives a shared editor capability such as `initialEditorMode` or `skipWizardForExistingBlocks`. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Assert Wizard guidance is visible and does not duplicate Visual card controls. |
| `tests/vitest/pageBuilder/wizardPanel.test.tsx`, `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`, `tests/vitest/pageBuilder/wizardFlow.test.tsx` | Update only if shared Wizard handoff or initial editor-state behavior changes. |
| `_docs/_WIDGETS/FEATURE_GRID.md` | Document Wizard/Visual division after all previous leaves land. |
| `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` | Record fixed/deferred status for UX-05/UX-10. |

## Implementation Pseudocode

```tsx
function FeatureGridWizardEditor(props: WidgetEditorProps<FeatureGridData>) {
  return (
    <div className="space-y-4">
      <WizardBasics />
      <p className="text-xs text-muted-foreground">
        Use Visual for card descriptions, media, CTA links, layout, and styling.
      </p>
    </div>
  );
}

type WidgetEditorEntryPolicy = {
  initialMode?: "wizard" | "visual";
  skipWizardForExistingBlocks?: boolean;
};

function resolveInitialEditorState(
  definition: WidgetDefinition,
  existingEditorState?: WidgetEditorState
): WidgetEditorState {
  if (existingEditorState?.wizardCompleted) return existingEditorState;
  const policy = definition.editorCapabilities?.entryPolicy;
  if (policy?.initialMode === "visual") {
    return { mode: "visual", wizardCompleted: true };
  }
  return { mode: "wizard", wizardCompleted: false };
}
```

Error handling:

- Current `WidgetEditorProps` exposes `value`, `onChange`, `variant`,
  `onVariantChange`, and `context`; it does not expose `onModeChange`.
- Keep the existing shared handoff through `WizardPanel.onComplete` and
  `applyWizardSelection`. Do not invent a widget-local tab state.
- Do not make Wizard duplicate Visual controls added by earlier TASK-267 leaves.
- If product review keeps Wizard as first open for all blocks, TASK-267-08 must
  record UX-10 as a deliberate deferral with rationale.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless a shared editor-entry field is
  introduced.
- Anti-abuse: no public runtime or user-authored HTML change in this leaf.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/wizardPanel.test.tsx` if the
  shared Wizard handoff label/copy changes.
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  and `bun run test:vitest -- tests/vitest/pageBuilder/wizardFlow.test.tsx` if
  shared initial editor-state behavior changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267-07_Feature_Grid_Wizard_Guidance_and_Editor_Entry_Flow.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Wizard clearly states which Feature Grid fields live in Visual.
- Common editing does not require an unexplained extra step after the initial
  setup decision is made.
- The shared Wizard/Visual/Advanced contract remains intact.
