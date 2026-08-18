# TASK-467-03-L02: Admin Widget Loader Map And Eager Barrel Removal
# FileName: TASK-467-03-L02-Admin-Widget-Loader-Map-And-Eager-Barrel-Removal.md

**Parent Subtask:** TASK-467-03
**Priority:** High
**Category:** Admin UI / Widgets / Bundle Performance
**Estimated Effort:** Large
**Dependencies:** TASK-467-03-L01
**Status:** ⏳ To Do
**Changelog:** 1308 (pinned; closure only)

---

## Overview

Replace the admin widget registry's static editor-barrel import with typed
`React.lazy` editor component bundles. Metadata registration must stay
synchronous, but editor modules should load only when an editor is rendered.

## Sub-Tasks

- [ ] Remove the eager `./editors` import from
  `core/admin/ui/widgets/registry.ts`.
- [ ] Create typed per-widget or grouped `React.lazy` imports for editor
  components.
- [ ] Wire core widget registration by passing the lazy editor map directly to
  the existing `registerCoreWidgets(editors)` contract.
- [ ] Keep direct editor imports available only for focused tests or explicit
  story/demo paths.
- [ ] Add source/import tests for the registry boundary.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/registry.ts` | Replace static editor barrel import with typed lazy editor component map. |
| `core/admin/ui/widgets/editors/index.ts` | Stop being imported by the registry; keep only if tests still need direct named exports. |
| `core/widgets/core/index.ts` | READ-ONLY reference: consume the `CoreWidgetEditors` type (widened by TASK-467-03-L01); do not edit. `ensureCoreWidgetsRegistered` remains in the admin registry. |
| `tests/vitest/admin/widgetsClient.test.ts` | Keep existing catalog/cache service coverage stable. Note: this file tests the `widgetsClient` catalog/cache service, NOT the registry boundary (pre-implementation audit finding). |
| `tests/vitest/admin/widgetRegistryBoundary.test.ts` | NEW dedicated registry-boundary test (owner of the source/import-boundary assertions in the regression-test shape below). |
| `tests/vitest/admin/adminBundleReport.test.ts` | READ-ONLY reference: file owned by TASK-467-03-L04 (closure evidence). L02 runs `bun --cwd core build:admin` + `check:admin-bundle` and records evidence for L04. |

## Implementation Pseudocode

```ts
import type { CoreWidgetEditors } from "../../../widgets/core";

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
```

```ts
// core/admin/ui/widgets/registry.ts
export function ensureCoreWidgetsRegistered() {
  registerCoreWidgets(editorLoaders);
}
```

The implementation must make `editorLoaders` exhaustive for every
`CoreWidgetEditors` key through `satisfies CoreWidgetEditors` and typecheck, not
through a manually maintained count. The current audit observed 38 required
widget keys across the `CoreWidgetEditors` type (verified against
`core/widgets/core/index.ts:275-317`). Note: `ScreenEditors` (which exports
editors for `screenRecordHeader`, `screenFieldValue`, `screenFieldGroup`, and
`screenTwoColumn`) is a separate Custom Screens widget editor group and is NOT
part of the 38 `CoreWidgetEditors` keys; the loader map only needs the core
keys.

Data flow:

- The registry imports lightweight widget metadata and lazy component wrappers.
- Dynamic imports inside `React.lazy` are not executed during metadata
  registration.
- Existing editor modules remain split by widget or small editor family.
- Do not replace the static barrel with `import("./editors")` or
  `import("./editors/index")`; lazy imports must target concrete editor modules
  such as `HeroEditors` or grouped modules such as `ScreenEditors`.
- The existing `ensureCoreWidgetsRegistered` entry point and
  `registerCoreWidgets(editors: CoreWidgetEditors)` shape remain intact.
- `core/widgets/core/index.ts` should only need type widening from L01; it should
  not become the owner of admin lazy-loader wiring.

Error handling:

- Loader map keys must be exhaustive for admin-editable core widgets.
- A missing loader-map entry should fail during typecheck or test setup, not at
  random user interaction time.
- Lazy module resolution should fail through the panel error boundary when an
  export is missing.

Regression-test shape (owner: `tests/vitest/admin/widgetRegistryBoundary.test.ts`):

```ts
test("admin widget registry does not import the editor barrel eagerly", () => {
  const source = readFile("core/admin/ui/widgets/registry.ts");
  expect(source).not.toMatch(/from\s+["']\.\/editors(?:\/index)?["']/);
  expect(source).not.toMatch(/import\s*\(\s*["']\.\/editors(?:\/index)?["']\s*\)/);
  expect(source).toContain('import("./editors/');
});

test("every editable core widget has an editor bundle", () => {
  const missing = listRegisteredWidgets()
    .filter((widget) => !widget.editor?.wizard || !widget.editor.visual || !widget.editor.advanced);

  expect(missing).toEqual([]);
});

test("lazy editor loaders target concrete modules only", () => {
  const source = readFile("core/admin/ui/widgets/registry.ts");
  const specifiers = [...source.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);
  expect(specifiers.every((s) => s.startsWith("./editors/") && !s.endsWith("/index"))).toBe(true);
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged widget schema/default validation.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** dynamic imports must remain browser-safe and must not
  include runtime/server adapters, provider keys, DB clients, or privileged
  settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/widgetsClient.test.ts tests/vitest/admin/widgetRegistryBoundary.test.ts`
- (adminBundleReport.test.ts runs in L04's validation)
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md` if the contributor editor registration example changes.
- Parent task/changelog on TASK-467 closure.

## Acceptance Criteria

1. `core/admin/ui/widgets/registry.ts` no longer imports `./editors` eagerly.
2. Every admin-editable core widget has an eager or lazy editor contract.
3. Widget metadata consumers still work without executing editor dynamic imports.
4. Build evidence shows `registry-*` no longer carries all editor code.
