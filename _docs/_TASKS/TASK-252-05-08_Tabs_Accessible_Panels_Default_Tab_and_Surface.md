# TASK-252-05-08: Tabs Accessible Panels Default Tab and Surface

# FileName: TASK-252-05-08_Tabs_Accessible_Panels_Default_Tab_and_Surface.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** Done
**Started:** 2026-05-11
**Completed:** 2026-05-12

---

## Overview

Promote Tabs to a real accessible tabs contract with items, default tab,
orientation, and keyboard semantics; panel surface variants stay Adapt scope.

This is an execution leaf under `TASK-252-05`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/tabs/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/tabs/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/tabs/MATRIX.md` as the binding research evidence for the final option set.
- Consume shared TASK-252 editor sections, rows, labels, info tips, and `data-widget-control` metadata from TASK-252-01; do not create a widget-local control framework.
- Keep schema/default/normalizer/render/editor/docs changes together and preserve existing saved payload compatibility.
- Keep layout choices beginner-readable through presets and bounded tokens rather than arbitrary CSS controls.

## Research Decisions

- Keep: tab items, `defaultItemId`, horizontal/vertical orientation, keyboard
  semantics, current `options.alignment`, and the existing `tabsPanelSlot` from
  `_docs/_WIDGETS/tmp/tabs/MATRIX.md`; map legacy `options.activeId` into
  schema-owned `options.defaultItemId` in `core/widgets/core/tabs.tsx` without
  changing saved alignment output.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat panel surface/visual variants, activation mode, lazy behavior, and overflow handling as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: pseudo-link navigation that pretends to be tabs and copied external markup.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `tabs`.
- `Visual`: `Items`, `Default tab`, `Orientation`, `Existing panel surface`, `Trigger/panel relationships`.
- `Advanced`: `Keyboard/a11y diagnostics`, `Legacy selected tab mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/tabs.tsx`
- `core/admin/ui/widgets/editors/TabsEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if slot or shared renderer output changes.
- `tests/unit/widgets/validator.test.ts` when schema validation or slot normalization changes.
- `tests/vitest/widgets/tabs.test.tsx`
- `tests/vitest/ui/tabs-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TABS.md`
- `_docs/_WIDGETS/tmp/tabs/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-05-08_Tabs_Accessible_Panels_Default_Tab_and_Surface.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## New Files to Create

- `_docs/_WIDGETS/TABS.md` if no canonical tabs widget page exists when this
  leaf is implemented.

## Implementation Pseudocode

```tsx
function normalizeTabsData(data: TabsData): TabsData {
  return {
    items: normalizeTabsItems(data.items),
    options: normalizeTabsOptions({
      ...data.options,
      defaultItemId: data.options?.defaultItemId ?? data.options?.activeId,
      orientation: data.options?.orientation ?? "horizontal",
    }),
    style: normalizeTabsStyle(data.style),
  };
}

function TabsVisualEditor(props: WidgetEditorProps<TabsData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="tabs.options" title="Tabs and panels">
      <WidgetControlRow id="tabs.options.defaultItemId" label="Default tab" data-widget-control="tabs.options.defaultItemId">
        <Select value={value.options?.defaultItemId ?? value.options?.activeId ?? value.items?.[0]?.id ?? ""} onChange={(defaultItemId) => props.onChange(updateTabsOptions(value, { defaultItemId }))} />
      </WidgetControlRow>
      <WidgetControlRow id="tabs.options.orientation" label="Orientation" data-widget-control="tabs.options.orientation">
        <SegmentedControl value={value.options?.orientation ?? "horizontal"} onChange={(orientation) => props.onChange(updateTabsOptions(value, { orientation }))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}

function renderTabsRuntime(panels: TabsPanel[], options: TabsOptions) {
  const activeId = resolveDefaultTabId(options.defaultItemId, panels);
  return (
    <div
      data-nextless-tabs="1"
      data-nextless-tabs-active-id={activeId}
      data-nextless-tabs-panels={String(panels.length)}
    >
      <div role="tablist" aria-orientation={options.orientation ?? "horizontal"}>
        {panels.map((panel) => (
          <button
            id={`tabs-trigger-${panel.instanceId}`}
            role="tab"
            type="button"
            aria-selected={panel.instanceId === activeId}
            aria-controls={`tabs-panel-${panel.instanceId}`}
            tabIndex={panel.instanceId === activeId ? 0 : -1}
            data-nextless-tabs-trigger
            data-nextless-tabs-id={panel.instanceId}
          >
            {panel.label}
          </button>
        ))}
      </div>
      {panels.map((panel) => (
        <div
          id={`tabs-panel-${panel.instanceId}`}
          role="tabpanel"
          aria-labelledby={`tabs-trigger-${panel.instanceId}`}
          data-nextless-tabs-panel
          data-nextless-tabs-id={panel.instanceId}
          data-state={panel.instanceId === activeId ? "active" : "inactive"}
          hidden={panel.instanceId !== activeId}
        />
      ))}
    </div>
  );
}

function bindTabsKeyboard(root: HTMLElement) {
  // ArrowLeft/ArrowRight drive horizontal tablists; ArrowUp/ArrowDown drive
  // vertical tablists. Home and End jump to the first/last enabled tab.
  // The handler must update aria-selected, tabIndex, hidden panels, focus, and
  // `data-nextless-tabs-active-id` through one shared sync function that uses
  // the existing `[data-nextless-tabs='1']`, `[data-nextless-tabs-trigger]`,
  // and `[data-nextless-tabs-panel]` runtime selectors.
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/tabs/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/tabs.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/TabsEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Preserve the current `options.alignment` schema/default/normalizer/render
  contract unless this same slice explicitly migrates it with compatibility
  tests. Adding `defaultItemId` or `orientation` must not change saved alignment
  classes.
- Add explicit trigger/panel ids and `aria-controls`/`aria-labelledby`; do not
  rely on text-only association between tabs and panels.
- Preserve existing runtime selectors (`data-nextless-tabs="1"`,
  `data-nextless-tabs-trigger`, `data-nextless-tabs-panel`, and
  `data-nextless-tabs-id`) so the current click script and new keyboard handler
  can share one sync path.
- Render tab panels as siblings after the `role="tablist"`, not descendants of
  the tablist, to match the ARIA tab pattern and the existing renderer shape.
- Add runtime keyboard handling for Arrow/Home/End keys, respecting horizontal
  vs vertical orientation and keeping focus on the active trigger.
- Current gap to fix: `tests/vitest/widgets/tabs.test.tsx` does not yet prove
  the `role="tabpanel"` nodes are siblings after `role="tablist"`; the
  implementation must add that assertion before this leaf can move to `Done`.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `tabs` output is public page/runtime output.
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
  - changed `tabs` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/tabs.tsx`.
- Anti-abuse:
  - No raw class-name interpolation from user-controlled fields.
  - No public write endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
  must cover default active tab mapping, dynamic `aria-orientation`,
  trigger/panel ids, `aria-controls`/`aria-labelledby`, and
  Arrow/Home/End keyboard behavior. Runtime tests must also assert
  `role="tabpanel"` nodes are not descendants of the `role="tablist"` node and
  that legacy `options.alignment` output remains unchanged.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TABS.md`
- `_docs/_WIDGETS/README.md`; `TABS.md` does not currently exist, so completing
  this leaf must create the page and index entry.
- `_docs/_TASKS/TASK-252-05-08_Tabs_Accessible_Panels_Default_Tab_and_Surface.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `tabs` Visual mode is sectioned, accessible, and metadata-backed.
- Final `tabs` options match Keep/Adapt/Reject decisions from the research matrix.
- Existing saved widget payloads remain backward compatible.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
