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
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add concise Wizard guidance, keep first-run setup minimal, and expose a clear Visual handoff. |
| `core/widgets/core/featureGrid.tsx` | Change only if widget definition needs a local editor-entry hint supported by shared page-builder code. |
| `core/admin/ui/pages/builder/*` | Touch only if a shared editor-entry API already exists; do not add a Feature Grid-only page-builder branch. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Assert Wizard guidance and Visual handoff state. |
| `tests/vitest/pageBuilder/*` | Update only if a shared editor-entry API changes. |
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
      <Button type="button" variant="outline" onClick={() => props.onModeChange?.("visual")}>
        Continue to Visual
      </Button>
    </div>
  );
}

function resolveFeatureGridInitialMode(context: WidgetEditorOpenContext) {
  if (context.isNewBlock) return "wizard";
  if (context.hasExistingFeatureGridData) return "visual";
  return "wizard";
}
```

Error handling:

- If shared editor props do not expose `onModeChange`, keep the current handoff
  button behavior and add guidance only. Do not invent a widget-local tab state.
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
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` or the
  exact page-builder suite if a shared editor-entry API changes.
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
