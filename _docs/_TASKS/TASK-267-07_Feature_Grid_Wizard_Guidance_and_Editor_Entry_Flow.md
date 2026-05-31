# TASK-267-07: Feature Grid Wizard Guidance and Editor Entry Flow

# FileName: TASK-267-07_Feature_Grid_Wizard_Guidance_and_Editor_Entry_Flow.md

**Priority:** Medium
**Category:** Widgets + Feature Grid + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-267-02, TASK-267-03, TASK-267-04, TASK-267-05, TASK-267-06
**Status:** Done (2026-05-17)

---

## Overview

Refine the Feature Grid Wizard so first-run setup is honest about its limited
scope after the expanded Visual editor is complete.

This leaf is Feature Grid-local onboarding work. It must preserve the shared
three-mode widget contract from `_docs/WIDGETS.md`. Shared builder entry-policy
changes are out of scope here and need a dedicated follow-up if product wants
them.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:226-228` - UX-05 Wizard edits
  only titles without explaining that Visual has full card editing.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:246-248` - UX-10 still
  motivates a shared first-open policy discussion, but the current live owner no
  longer has a widget-local "Continue to layout and styling" seam to patch.
- `_docs/WIDGETS.md:54-105` - shared Wizard/Visual/Advanced ownership.
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` - current Wizard owner
  is guidance-only plus shared panel handoff.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add concise Wizard guidance and keep first-run setup minimal. Do not add widget-local tab state. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Assert Wizard guidance is visible and does not duplicate Visual card controls. |
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
```

Error handling:

- Current `WidgetEditorProps` exposes `value`, `onChange`, `variant`,
  `onVariantChange`, and `context`; it does not expose `onModeChange`.
- Keep the existing shared handoff through `WizardPanel.onComplete` and
  `applyWizardSelection`. Do not invent a widget-local tab state.
- If product wants a shared first-open editor policy, split that work into a
  dedicated shared builder task instead of expanding TASK-267-07 ad hoc.
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
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267-07_Feature_Grid_Wizard_Guidance_and_Editor_Entry_Flow.md`
- `_docs/_TASKS/README.md` on status changes

## Completion Notes

- Done (2026-05-17). Wizard now explicitly routes richer card/media/layout work
  to Visual without inventing a widget-local shared builder policy.
- `UX-10` remains documented as a shared builder follow-up decision rather than
  a local hack.

## Acceptance Criteria

- Wizard clearly states which Feature Grid fields live in Visual.
- UX-10 is either closed through local guidance or explicitly deferred as a
  shared builder decision rather than a widget-local hack.
- The shared Wizard/Visual/Advanced contract remains intact.
