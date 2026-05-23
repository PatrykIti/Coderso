# TASK-336-07: Tabs Mode Ownership

# FileName: TASK-336-07_Tabs_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Tabs + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-288, TASK-330
**Status:** To Do

---

## Overview

Remove residual `Visual` duplication from the `tabs` Advanced mode and align
Tabs with the v2 editor contract.

Tabs already received product follow-ups, but the shared audit still treats it
as P1 risk because Advanced may repeat structure, layout, trigger style, color,
or visual controls that belong to daily authoring. This task must preserve the
recent Tabs fixes while making Advanced technical-only or read-only.

## Ownership Decision

- `Wizard` owns initial tab count, starter structure, default tab setup, and
  onboarding guidance.
- `Visual` owns tab labels, panel intro/content affordances, disabled state,
  trigger metadata, layout, overflow, typography, spacing, colors, and motion.
- `Advanced` owns technical ids, activation/runtime diagnostics, script/runtime
  summary, accessibility diagnostics, and read-only visual summaries where
  useful.

Evidence caveat: the re-audit finding is source-backed, not a completed
38-widget browser traversal. TASK-336-03 admin smoke must confirm this widget
before the task can move to Done.

## Current Advanced Writable Paths to Remove

| Current section | Current duplicated writable owner | Final owner |
|---|---|---|
| `tabs.variant` | `variant` via `onVariantChange` | Visual |
| `tabs.structure` | `items`, `options.defaultItemId`, `options.activeId`, disabled/metadata fields | Visual |
| `tabs.layout` | `options.orientation`, `options.triggerOverflow`, `options.containerPadding`, `options.triggerGap`, `options.panelGap` | Visual |
| `tabs.trigger-style` | `options.triggerTextSize`, `options.triggerFontWeight`, `options.motion` | Visual |
| `tabs.colors` | `style.surfaceColor`, `style.borderColor`, `style.activeBackgroundColor`, `style.activeTextColor`, `style.inactiveTextColor`, `style.panelBackgroundColor` | Visual |

## Sub-Tasks

- [ ] Compare current Tabs editor against TASK-288 and TASK-330 closure claims.
- [ ] Add or update `tabs` `editorContract` metadata.
- [ ] Remove writable Visual controls from Advanced.
- [ ] Convert necessary Advanced visibility into read-only summaries.
- [ ] Preserve current accessibility behavior and runtime script dedupe.
- [ ] Add tests that fail if Advanced reintroduces structure/style controls.
- [ ] Run the existing Tabs suites before closure.
- [ ] Capture Playwright admin smoke evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/tabs.tsx` | Add/update `editorContract`; preserve runtime semantics from TASK-288/TASK-330. |
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | Remove or downgrade duplicate Advanced controls. |
| `tests/vitest/widgets/tabs.test.tsx` | Preserve runtime/normalize/accessibility regression coverage if touched. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | Add explicit mode ownership and no-duplicate Advanced assertions. |
| `_docs/_WIDGETS/TABS.md` | Document final ownership if wording changes. |

## Implementation Pseudocode

```tsx
function TabsAdvancedEditor(props: WidgetEditorProps<TabsData>) {
  return (
    <WidgetEditorModeRoot mode="advanced" widgetType="tabs">
      <WidgetEditorSection mode="advanced" sectionId="tabs-runtime" role="diagnostics" title="Runtime diagnostics">
        <ReadonlyWidgetSummaryRow label="Default tab" value={resolveDefaultTabLabel(props.value)} />
        <ReadonlyWidgetSummaryRow label="Activation model" value="Root scoped, accessible tablist" />
      </WidgetEditorSection>
      <WidgetEditorSection mode="advanced" sectionId="tabs-ids" role="technical" title="Technical ids">
        <StableIdSummary tabs={props.value.items} />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
```

Data flow:

- Visual remains the writable daily owner for trigger/panel/layout/style.
- Advanced reads normalized tabs and renders diagnostics only.
- Runtime and preview behavior from previous Tabs tasks remains unchanged.

Error handling:

- Do not remove diagnostics needed to debug active tab or id mismatches.
- Do not reintroduce client scripts in preview as part of editor cleanup.
- If a duplicate appears necessary, add a temporary allowlist with a removal
  task and explain why Visual cannot be the single owner.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public write changes.
- Secret handling: no secrets in diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `tabs` admin modes and public fixture.

Regression-test shape:

- Advanced has no writable paths for layout, trigger style, colors, spacing, or
  tab item content.
- Visual still exposes the daily Tabs controls.
- Existing tab accessibility assertions remain green.

## Documentation Updates Required

- Update Tabs widget docs if Advanced mode wording changes.
- Append a dated TASK-336-07 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Tabs Advanced is no longer a second Visual editor.
- Recent Tabs product/accessibility fixes are preserved.
- Tests prove the final owner mode for structure and style paths.
