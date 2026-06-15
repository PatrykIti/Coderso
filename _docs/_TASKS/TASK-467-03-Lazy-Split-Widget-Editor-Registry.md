# TASK-467-03: Lazy Split Widget Editor Registry
# FileName: TASK-467-03-Lazy-Split-Widget-Editor-Registry.md

**Parent Task:** TASK-467
**Priority:** High
**Category:** Widgets / Admin UI / Bundle Performance
**Estimated Effort:** Large
**Dependencies:** TASK-467-02, TASK-464
**Status:** ⏳ To Do

---

## Overview

Stop `core/admin/ui/widgets/registry.ts` from statically importing every widget
editor through `core/admin/ui/widgets/editors/index.ts`.

The current registry chunk is larger than the Vite 500 kB warning threshold
because metadata access and editor rendering share one static module graph.
Widget metadata is needed by list, picker, builder, and library surfaces, but
the actual editor components are only needed when a selected widget/editor mode
is rendered.

This task uses `React.lazy` editor components while preserving the existing
required `WidgetDefinition.editor.{wizard,visual,advanced}` shape. It should not
introduce an optional `loadEditor` contract unless implementation proves
`React.lazy` cannot satisfy the split. Widget picker, Custom Screens builder,
Page builder compatibility paths, and widget-library behavior must remain
compatible.

## Sub-Tasks

- [ ] TASK-467-03-L01: Lazy editor component contract and registry
  compatibility.
- [ ] TASK-467-03-L02: Admin widget loader map and eager barrel removal.
- [ ] TASK-467-03-L03: Shared widget editor outlet and builder surface wiring.
- [ ] TASK-467-03-L04: Bundle evidence, docs, and closure validation.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/types.ts` | Widen editor component typing only if needed so `React.lazy` components are accepted while the `editor` object stays required. Do not make `editor` optional in this task by default. |
| `core/widgets/core/index.ts` | Reference only if the local `EditorBundle` type must accept lazy component types. The registration/factory shape should otherwise stay intact. |
| `core/admin/ui/widgets/registry.ts` | Replace static editor barrel import with per-widget or grouped `React.lazy` editor components. |
| `core/admin/ui/widgets/editors/index.ts` | Keep only if still useful for tests/story paths; do not make registry import it eagerly. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Route editor rendering through a shared lazy outlet instead of assuming eager `definition.editor`. |
| `core/admin/ui/pages/builder/WizardPanel.tsx` | Route wizard rendering through the shared outlet or a mode-specific lazy wrapper. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Route visual rendering through the shared outlet or a mode-specific lazy wrapper. |
| `core/admin/ui/pages/builder/AdvancedPanel.tsx` | Route advanced rendering through the shared outlet or a mode-specific lazy wrapper. |
| `core/admin/ui/widgets/WidgetLibraryPage.tsx` | Keep metadata/list behavior without loading all editors. |
| `core/admin/ui/pages/builder/blockUtils.ts` and builder surfaces | Update only if they directly assume eager editor components. |
| Custom Screens builder/editor files | Update editor rendering paths if they read `definition.editor` directly. |
| Tests under `tests/vitest/admin` and `tests/vitest/ui*` | Add focused lazy-load and source-import coverage. |

## Implementation Pseudocode

```ts
// core/widgets/types.ts
export type WidgetEditorComponent<T> =
  | ComponentType<WidgetEditorProps<T>>
  | LazyExoticComponent<ComponentType<WidgetEditorProps<T>>>;

export type WidgetEditorBundle<T> = {
  wizard: WidgetEditorComponent<T>;
  visual: WidgetEditorComponent<T>;
  advanced: WidgetEditorComponent<T>;
};

export type WidgetDefinition<T = Record<string, unknown>> = {
  // Existing fields...
  editor: WidgetEditorBundle<T>;
};
```

```ts
// core/admin/ui/widgets/registry.ts
import { lazy } from "react";

function lazyNamedEditor<T extends Record<string, unknown>, M extends Record<string, unknown>>(
  loadModule: () => Promise<M>,
  exportName: keyof M
): WidgetEditorComponent<T> {
  return lazy(async () => {
    const module = await loadModule();
    return { default: module[exportName] as ComponentType<WidgetEditorProps<T>> };
  });
}

const editorLoaders = {
  hero: {
    wizard: lazyNamedEditor<HeroData>(() => import("./editors/HeroEditors"), "HeroWizardEditor"),
    visual: lazyNamedEditor<HeroData>(() => import("./editors/HeroEditors"), "HeroVisualEditor"),
    advanced: lazyNamedEditor<HeroData>(() => import("./editors/HeroEditors"), "HeroAdvancedEditor"),
  },
  listingFilters: {
    wizard: lazyNamedEditor<ListingFiltersData>(
      () => import("./editors/ListingFiltersEditors"),
      "ListingFiltersWizardEditor"
    ),
    visual: lazyNamedEditor<ListingFiltersData>(
      () => import("./editors/ListingFiltersEditors"),
      "ListingFiltersVisualEditor"
    ),
    advanced: lazyNamedEditor<ListingFiltersData>(
      () => import("./editors/ListingFiltersEditors"),
      "ListingFiltersAdvancedEditor"
    ),
  },
  // ...all remaining CoreWidgetEditors keys...
} satisfies CoreWidgetEditors;

export function ensureCoreWidgetsRegistered() {
  registerCoreWidgets(editorLoaders);
}
```

```tsx
// shared widget editor renderer
function WidgetEditorOutlet({ definition, mode, value, onChange, context }) {
  const Editor = definition.editor[mode];
  return (
    <Suspense fallback={<EditorLoadingState widgetTitle={definition.title} mode={mode} />}>
      <Editor value={value} onChange={onChange} variant={variant} context={context} />
    </Suspense>
  );
}
```

Data flow:

- Widget metadata registration remains synchronous so pickers, filters, surfaces,
  capabilities, and pack matrix checks still work without waiting for editor
  modules.
- The lazy editor map must be exhaustive for every `CoreWidgetEditors` key
  through `satisfies CoreWidgetEditors` and typecheck, not through a manually
  maintained count. The current audit observed 42 required widget keys across 39
  editor modules, including grouped modules such as `ScreenEditors`.
- Editor modules are represented by `React.lazy` components and load only after
  a concrete widget and editor mode are rendered.
- Do not replace the static barrel with `import("./editors")` or
  `import("./editors/index")`; lazy imports must target concrete editor modules
  such as `HeroEditors` or grouped modules such as `ScreenEditors`.
- Tests can still import editor modules directly when they own editor behavior.

Error handling:

- Lazy import failures render through a bounded admin error state and do not
  corrupt widget block data.
- Missing `editor.wizard`, `editor.visual`, or `editor.advanced` remains a
  contract error.
- Shared editor modules are allowed; use registration keys such as
  `listingFilters` and `screenRecordHeader`, not kebab-case pseudo keys.
- `Suspense` fallbacks must be local to the editor panel so surrounding builder
  UI, dirty state, and preview controls remain usable.

Regression-test shape:

```ts
test("admin widget registry does not import the editor barrel eagerly", () => {
  const source = readFile("core/admin/ui/widgets/registry.ts");
  expect(source).not.toMatch(/from\s+["']\.\/editors(?:\/index)?["']/);
  expect(source).not.toMatch(/import\s*\(\s*["']\.\/editors(?:\/index)?["']\s*\)/);
  expect(source).toContain('import("./editors/');
});

test("selected widget editor loads lazily", async () => {
  render(<WidgetEditorOutlet definition={heroDefinitionWithLoader} mode="visual" />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(await screen.findByText("Hero")).toBeInTheDocument();
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged admin route permissions.
- **CSRF expectations:** unchanged for widget/screen/page mutations.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** widget schema/default normalizers and service
  write paths remain the authority.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** lazy imports must not include server-only modules,
  provider keys, DB clients, storage adapters, or privileged settings in the
  browser bundle.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts tests/vitest/admin/widgetsClient.test.ts tests/vitest/admin/widgetEditorLayoutCss.test.ts`
- `bun run test:vitest -- tests/vitest/pageBuilder/wizardPanel.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/pageBuilder/advancedPanelLeaf.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx`
- Focused UI tests for widget editor lazy loading in the surfaces changed by the
  implementation.
- Source/import-boundary test proving `core/admin/ui/widgets/registry.ts` does
  not import `./editors` eagerly.
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run gates:coderso:perf`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md` or `_docs/WIDGET_PACK_MATRIX.md` only if the widget editor
  contract changes for contributors.
- `_docs/ARCHITECTURE.md` if lazy admin editor bundles become a general rule.
- Parent task/changelog on closure.

## Acceptance Criteria

1. Widget metadata access does not statically load every widget editor module.
2. Rendering a selected widget editor still supports wizard, visual, and
   advanced modes.
3. Widget picker, Widget Library, Page builder compatibility paths, and Custom
   Screens builder behavior remain intact.
4. `registry-*.js` is materially reduced or split into smaller lazy editor
   chunks, with before/after build evidence recorded.
