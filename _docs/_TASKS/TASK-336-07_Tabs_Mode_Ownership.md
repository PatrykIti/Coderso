# TASK-336-07: Tabs Mode Ownership

# FileName: TASK-336-07_Tabs_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Tabs + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-288, TASK-330
**Status:** Done (2026-05-24)

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
- `Visual` owns tab labels, content intro affordances, unavailable state, tab
  subtitle/icon metadata, layout, typography, spacing, colors, and motion.
- `Advanced` owns read-only behavior, saved tab, display, accessibility, and
  contract summaries. It must not expose technical IDs, JSON payload snapshots,
  CSS token text, or implementation suffixes to nontechnical authors.

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

- [x] Compare current Tabs editor against TASK-288 and TASK-330 closure claims.
- [x] Add or update `tabs` `editorContract` metadata.
- [x] Remove writable Visual controls from Advanced.
- [x] Convert necessary Advanced visibility into read-only summaries.
- [x] Preserve current accessibility behavior and runtime script dedupe.
- [x] Add tests that fail if Advanced reintroduces structure/style controls.
- [x] Run the existing Tabs suites before closure.
- [x] Capture Playwright admin smoke evidence.

## Status Notes

- 2026-05-24: Completed. Wizard now owns starter tab count and default-tab
  setup only, Visual owns variant/content/layout/trigger-style/color authoring,
  and Advanced was initially read-only runtime diagnostics, technical IDs,
  payload, and contract summary. This 2026-05-24 Advanced wording is superseded
  by the 2026-05-25 `TASK-336-19` note below. The widget declares a v2
  `editorContract`, targeted Vitest ownership/runtime coverage passes, and
  Playwright smoke for `tabs` passed with no admin, metadata, or public
  failures.
- 2026-05-24: Lifecycle caveat: this task is an ownership cleanup only. Wizard
  remains visible as a standard editor tab until `TASK-336-16` ships the
  one-time Wizard lifecycle and `Run setup again` affordance. TASK-336-07 also
  supersedes the earlier Tabs Wizard layout shortcut from TASK-288; layout is
  now Visual-owned.
- 2026-05-25: Superseded by `TASK-336-19` Tabs drift cleanup. Visual color
  controls now use swatch-only authoring instead of visible raw CSS/token text
  inputs, Advanced now renders human read-only summaries instead of raw JSON
  payloads or technical ID/suffix output, Tabs no longer expose or render the
  unapproved horizontal-scroll option, and repeatable editor contract paths use
  wildcard paths such as `items.*.label` instead of aggregate `items.label`
  shortcuts.

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
      <WidgetEditorSection mode="advanced" sectionId="tabs-behavior" role="diagnostics" title="Behavior summary">
        <ReadonlyWidgetSummaryRow label="Default tab" value={resolveDefaultTabLabel(props.value)} />
        <ReadonlyWidgetSummaryRow label="Line behavior" value="Tabs wrap onto extra lines when space is tight." />
      </WidgetEditorSection>
      <WidgetEditorSection mode="advanced" sectionId="tabs-display" role="summary" title="Saved display summary">
        <ReadonlyWidgetSummaryRow label="Tab label style" value={resolveDisplaySummary(props.value)} />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
```

Data flow:

- Visual remains the writable daily owner for tab content/layout/style.
- Advanced reads normalized tabs and renders human diagnostics only.
- Runtime and preview behavior from previous Tabs tasks remains unchanged.

Error handling:

- Do not remove diagnostics needed to explain active/default tab mismatches.
- Do not render raw IDs or JSON snapshots in the default Advanced UI.
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
