# TASK-467-03-L03: Shared Widget Editor Outlet And Builder Surface Wiring
# FileName: TASK-467-03-L03-Shared-Widget-Editor-Outlet-And-Builder-Surface-Wiring.md

**Parent Subtask:** TASK-467-03
**Priority:** High
**Category:** Admin UI / Widgets / Page Builder / Custom Screens
**Estimated Effort:** Large
**Dependencies:** TASK-467-03-L02
**Status:** ⏳ To Do
**Changelog:** 1308 (pinned; closure only)

---

## Overview

Introduce a shared `Suspense`/error-boundary editor outlet and route every
builder/editor surface that currently reads `definition.editor[mode]` through
it. The user-visible wizard, visual, and advanced modes must remain equivalent
while `React.lazy` editor modules load on demand.

## Sub-Tasks

- [ ] Add a shared `WidgetEditorOutlet` with local `Suspense` fallback and
  bounded error state.
- [ ] Update Page builder `WizardPanel`, `VisualPanel`, `AdvancedPanel`, and
  `BlockSettings` to use the outlet.
- [ ] Update Custom Screens builder/editor paths if they render widget editors
  directly.
- [ ] Preserve variant, block patch, context, slot, preview, and dirty-state
  behavior.
- [ ] Add loading, error, retry, and cancellation tests.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/WidgetEditorOutlet.tsx` | New shared lazy/eager editor renderer. |
| `core/admin/ui/pages/builder/WizardPanel.tsx` | Use outlet for wizard mode. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Use outlet for visual mode. |
| `core/admin/ui/pages/builder/AdvancedPanel.tsx` | Use outlet for advanced mode. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Preserve tab/mode behavior while delegating editor rendering. |
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | READ-ONLY reference: file owned by TASK-467-02 (import split). Route its editor rendering through the shared outlet only as part of 467-02's change, not here. |
| `tests/vitest/admin/widgetEditorLayoutCss.test.ts` | Keep layout/CSS behavior green. |
| `tests/vitest/pageBuilder/wizardPanel.test.tsx` | Cover Page builder wizard panel parity after outlet routing. |
| `tests/vitest/pageBuilder/visualPanel.test.tsx` | Cover Page builder visual panel parity after outlet routing. |
| `tests/vitest/pageBuilder/advancedPanelLeaf.test.tsx` | Cover advanced panel leaf behavior after outlet routing. |
| `tests/vitest/pageBuilder/blockSettings.test.tsx` | Cover tab/mode and selected-block settings behavior after outlet routing. |
| Focused UI tests under `tests/vitest/ui-integration/` | Cover lazy loading, stale-selection cancellation, and loader failure state. |

## Implementation Pseudocode

```tsx
type WidgetEditorOutletProps<T extends Record<string, unknown>> = {
  definition: WidgetDefinition<T>;
  mode: EditorMode;
  value: T;
  onChange: (next: T) => void;
  variant: string;
  onVariantChange: (next: string) => void;
  onBlockPatch?: WidgetBlockPatcher;
  context?: WidgetEditorContext;
};

export function WidgetEditorOutlet<T extends Record<string, unknown>>(props: WidgetEditorOutletProps<T>) {
  const { definition, mode } = props;
  const Editor = definition.editor[mode];
  return (
    <WidgetEditorErrorBoundary resetKey={`${definition.type}:${mode}`} widgetTitle={definition.title}>
      <Suspense fallback={<EditorLoadingState widgetTitle={definition.title} mode={mode} />}>
        <Editor {...mapOutletPropsToEditorProps(props)} />
      </Suspense>
    </WidgetEditorErrorBoundary>
  );
}
```

Data flow:

- Builder panels keep owning surrounding chrome, copy, tabs, slot controls,
  preview state, and actions.
- The outlet owns only editor component resolution and the final editor render.
- Selection changes reset the error boundary by `definition.type` and mode.

Error handling:

- Dynamic import failures render bounded UI without mutating the widget block.
- Missing editor modes still fail at registration and should not reach the
  outlet in normal operation.
- Loading fallbacks are scoped inside the editor panel and do not blank the full
  builder shell.

Regression-test shape:

```tsx
test("widget editor outlet renders lazy editor fallback locally", async () => {
  render(<WidgetEditorOutlet definition={heroWithLazyEditor} mode="visual" />);
  expect(screen.getByText(/loading editor/i)).toBeInTheDocument();
  expect(await screen.findByText("Hero visual editor")).toBeInTheDocument();
});

test("widget editor outlet keeps non-lazy editors synchronous", () => {
  render(<WidgetEditorOutlet definition={heroWithEagerEditor} mode="wizard" />);
  expect(screen.getByText("Hero wizard editor")).toBeInTheDocument();
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** editor UI still writes through existing widget
  schema/default and page/screen service normalizers.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** editor load errors must not dump private payloads,
  cookies, tokens, or raw server responses into UI or logs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/widgetEditorLayoutCss.test.ts`
- `bun run test:vitest -- tests/vitest/pageBuilder/wizardPanel.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/pageBuilder/advancedPanelLeaf.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx`
- Focused UI integration tests for Page builder and Custom Screens builder
  surfaces touched by the outlet.
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md` if editor loading states become contributor-visible.
- Parent task/changelog on TASK-467 closure.

## Acceptance Criteria

1. Wizard, visual, and advanced editors render through the shared outlet.
2. Eager editor behavior remains synchronous where still used.
3. Lazy editor loading is keyed by widget type and cancellation-safe.
4. Loader failures do not mutate widget data or break surrounding builder UI.
