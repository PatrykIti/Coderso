# TASK-336-16: Existing One-Time Wizard Lifecycle and Daily Work Tabs

# FileName: TASK-336-16_One_Time_Wizard_and_Daily_Work_Tabs.md

**Priority:** High
**Category:** Page Builder + Widgets + Admin UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-336-04, TASK-336-05, TASK-336-06, TASK-336-07, TASK-336-08, TASK-336-09, TASK-336-10, TASK-336-11, TASK-336-12, TASK-336-13, TASK-336-14, TASK-336-15, TASK-336-18
**Status:** To Do

---

## Overview

Harden the existing one-time Wizard lifecycle after every widget has a correct
tested mode ownership contract.

The target UX is: Wizard helps with initial setup, then daily work happens in
the tabs authors actually need. This must not ship before ownership is fixed,
otherwise old duplicated controls will simply be hidden or reshuffled without
solving the contract.

## Target UX

- New widget insertion opens `Wizard` when setup is incomplete.
- Completing Wizard marks the widget setup as complete.
- Daily editing defaults to `Visual`.
- `Advanced` remains available for technical diagnostics and technical-only
  controls.
- Wizard can be reopened through an explicit action such as `Run setup again`
  or `Edit setup`, not as a normal daily tab competing with Visual.
- The UI clearly shows a read-only setup summary after Wizard completion.

Current repo baseline: `WidgetBlock.editor.mode` and
`WidgetBlock.editor.wizardCompleted` already exist, `applyWizardSelection`
already completes Wizard by setting `{ mode: "visual", wizardCompleted: true }`,
and `BlockSettings` already branches on `editorState.wizardCompleted`.

## Product Decision Checkpoint

Before implementation starts, confirm the exact daily tab labels:

- Option A: `Visual` and `Advanced` only after Wizard completion.
- Option B: `Content`, `Visual`, and `Advanced` after Wizard completion where
  `Content` is daily copy/data authoring and Wizard remains setup-only.
- Option C: Keep `Wizard`, `Visual`, `Advanced` labels but collapse Wizard into
  a completed summary plus explicit rerun action.

Recommended default: Option A for widgets whose daily content is already in
Visual; Option B only if the implementation proves `Visual` is becoming too
broad for content-heavy widgets. Do not choose per-widget labels ad hoc without
recording the rule.

Blocking decision gate: record the chosen Option A/B/C in this task before any
editor-shell code is written. Decision owner is the product/UX owner for the
page builder; Claude feedback may inform the decision, but cannot replace the
recorded repo decision.

## Sub-Tasks

- [ ] Verify all prior `TASK-336-*` leaves are complete and strict contract
  tests pass.
- [ ] Reuse the existing `WidgetBlock.editor.wizardCompleted` state instead of
  adding a parallel `setupState` model.
- [ ] Decide whether any extension of `WidgetBlock.editor` is needed; if yes,
  update `core/server/validation/pageSchemas.ts` and document whether a DB
  migration is required.
- [ ] Update page-builder editor tab behavior for new and existing widgets.
- [ ] Remove the double-header IA when returning to Wizard by ensuring
  `WizardPanel` and `BlockSettings` share one selected-widget header region.
- [ ] Add `Run setup again` or equivalent explicit affordance.
- [ ] Add dirty-state protection so completing/reopening Wizard does not
  overwrite unsaved Visual edits.
- [ ] Add cache/prefetch/SPA consistency if editor shell state is cached.
- [ ] Add Vitest UI tests for first insertion, completed setup, rerun setup,
  and legacy widget behavior.
- [ ] Add Playwright smoke for representative widgets across setup lifecycle.
- [ ] Use Claude for UX copy/flow review and record accepted/rejected feedback.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/builder/*` | Update widget editor shell/tab behavior and setup lifecycle. |
| `core/admin/ui/widgets/*` | Wire one-time Wizard state into widget editor opening behavior. |
| `core/widgets/types.ts` | Reuse existing `WidgetEditorState.mode` and `WidgetEditorState.wizardCompleted`; extend only with a schema-backed decision. |
| `core/server/validation/pageSchemas.ts` | Update only if `WidgetBlock.editor` changes beyond the existing `mode` and `wizardCompleted` fields. |
| `core/widgets/editorContract.ts` | Add validation for setup-mode requirements if needed. |
| `tests/vitest/pageBuilder/wizardFlow.test.tsx` | Cover Wizard completion, rerun setup, and default daily mode. |
| `tests/vitest/pageBuilder/blockSettings*.test.tsx` | Cover selected-widget header and completed Wizard summary behavior. |
| `tests/vitest/ui/widget-editors-wave-1.test.tsx` | Add representative widget editor smoke if shared widget editor behavior changes. |
| `_docs/WIDGETS.md` | Document final one-time Wizard and daily tab contract. |

## Implementation Pseudocode

```ts
function resolveInitialEditorMode(block: Block, contract: WidgetEditorContract): EditorMode {
  if (!block.editor?.wizardCompleted && hasWizardSetup(contract)) {
    return "wizard";
  }
  return block.editor?.mode === "advanced" ? "advanced" : "visual";
}

function completeWidgetSetup(block: Block): Block {
  return {
    ...block,
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };
}
```

Implementation must call or preserve `applyWizardSelection` instead of
duplicating completion behavior in a second helper.

Data flow:

- Widget data remains normalized by widget modules.
- Setup completion is resolved from the existing `WidgetBlock.editor` object,
  not a second state model.
- Legacy widgets with `editor.wizardCompleted=false` open Wizard when required
  setup data is incomplete; complete legacy widgets move to Visual.
- Dirty-state protection prevents setup completion from clobbering pending
  Visual/Advanced edits.

Error handling:

- If setup completion fails validation, keep the user in Wizard and show
  specific missing requirements.
- If a legacy widget has incomplete setup, keep or reset `wizardCompleted=false`
  and open Wizard even if it existed before
  this migration.
- If a widget has no Wizard contract, default to Visual and log a strict test
  failure for closure unless explicitly exempted.
- Do not hide Advanced diagnostics for users who need technical visibility.

## Security Contract

No API routes are added unless editor state persistence requires an existing
page save payload extension.

- Endpoint visibility: internal admin page writes only through existing
  `POST /pages`, `PATCH /pages/:id`, and `POST /pages/:id/autosave`.
- Auth/RBAC: existing `content:write` permission applies to create/update and
  autosave writes.
- CSRF: existing admin write CSRF policy applies.
- Rate limit: existing admin write bucket applies.
- Reject-unknown validation: any `WidgetBlock.editor` extension must be
  schema-defined in `core/server/validation/pageSchemas.ts` and reject unknown
  fields.
- Anti-abuse: not applicable beyond existing admin write protections.
- Secret handling: editor state must not include secrets or privileged settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Focused page-builder/editor shell Vitest suites for setup lifecycle.
- Focused widget editor suites for representative setup-heavy widgets:
  `template-section`, `search-box`, `listing-filters`, `hero`, `tabs`,
  `stats-kpi`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- Playwright CLI smoke for new widget insertion, Wizard completion, reopening
  setup, daily Visual edit, and Advanced diagnostics.

Regression-test shape:

- New setup-incomplete widget opens Wizard.
- Completing setup switches future daily opens to Visual.
- `Run setup again` reopens Wizard without data loss.
- Legacy complete widgets open Visual.
- Legacy incomplete widgets open Wizard.
- Unsaved Visual edits are not overwritten by Wizard state changes.
- `applyWizardSelection` remains the canonical completion helper.

## Documentation Updates Required

- Update `_docs/WIDGETS.md` with final one-time Wizard contract.
- Update affected `_docs/_WIDGETS/*` docs if widget-specific setup behavior
  differs.
- Update `_docs/PLAYWRIGHT` with setup lifecycle smoke evidence.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Wizard is no longer a permanent daily-work tab by default after setup.
- Daily editing is simpler and based on the tested owner contract.
- The setup lifecycle is backwards-compatible and test-backed.
- Claude UX feedback is recorded with concrete accepted/rejected decisions.
