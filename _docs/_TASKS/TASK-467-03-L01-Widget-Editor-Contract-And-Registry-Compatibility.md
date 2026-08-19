# TASK-467-03-L01: Lazy Editor Component Contract And Registry Compatibility
# FileName: TASK-467-03-L01-Widget-Editor-Contract-And-Registry-Compatibility.md

**Parent Subtask:** TASK-467-03
**Priority:** High
**Category:** Widgets / Contracts / Bundle Performance
**Estimated Effort:** Medium
**Dependencies:** TASK-467-03
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1308 (pinned; closure only)

---

## Overview

Preserve the existing required widget editor object while allowing its
components to be `React.lazy` components. This is the compatibility foundation
for splitting the large widget editor registry chunk without changing the core
registration/factory contract more than necessary.

The change must preserve synchronous widget metadata registration for runtime,
picker, pack-matrix, capability, and schema/default validation paths.

## Sub-Tasks

- [ ] Add or expose a typed `WidgetEditorComponent<T>` that accepts eager
  components and `React.lazy` components.
- [ ] Add `WidgetEditorBundle<T>` = `{ wizard, visual, advanced }` of
  `WidgetEditorComponent<T>` and use it for `WidgetDefinition<T>.editor`.
- [ ] Keep `WidgetDefinition<T>.editor` required with `wizard`, `visual`, and
  `advanced` component slots.
- [ ] Keep `registerWidget` validation fail-closed for missing editor modes.
- [ ] Widen the 42 per-widget factory editor params in
  `core/widgets/core/*.tsx` from inline `ComponentType<WidgetEditorProps<T>>`
  to the shared `WidgetEditorBundle<T>` type (verified: 42 files match
  `wizard: ComponentType<WidgetEditorProps`; `footerSocialIcons.tsx`,
  `formEmbedFields.tsx`, `listingFiltersRenderer.tsx` have no widget factory
  and need no change). React 19 `LazyExoticComponent` is NOT assignable to
  `ComponentType`, so `satisfies CoreWidgetEditors` in L02 fails unless the
  factory params are widened first. Repo precedent for the union shape:
  `core/admin/app/adminRouteComponents.tsx:5-6`.
- [ ] Update core widget registration typing only where needed so lazy
  components satisfy the existing editor object.
- [ ] Avoid adding an optional `loadEditor` contract unless implementation
  proves `React.lazy` cannot meet the bundle split safely.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/types.ts` | Widen editor component typing for `React.lazy`: add `WidgetEditorComponent<T>` union (`ComponentType<WidgetEditorProps<T>>` \| `LazyExoticComponent<ComponentType<WidgetEditorProps<T>>>`) and `WidgetEditorBundle<T>`, use it in `WidgetDefinition.editor`. |
| `core/widgets/registry.ts` | Keep required editor-mode validation intact. Update only if the lazy component type requires a narrower validation helper (current truthy check `!def.editor?.wizard || ...` at line ~300 keeps working for lazy objects). |
| `core/widgets/core/index.ts` | Widen local `EditorBundle<T>` to the shared `WidgetEditorBundle<T>`; keep the `CoreWidgetEditors` object shape intact (38 keys). |
| `core/widgets/core/*.tsx` (42 factory files) | Replace inline `{ wizard: ComponentType<WidgetEditorProps<T>>; visual: ...; advanced: ... }` editor params with the shared `WidgetEditorBundle<T>` type. This is the type-widening blocker found by the pre-implementation audit (MEDIUM). |
| `tests/vitest/widgets/editorContract.test.ts` | Cover core registry contract behavior for eager and lazy editor components (owner). Add a lazy-registration test using a real `React.lazy` component and a `createCoreWidgetDefinitions` factory smoke using a lazy bundle. |

## Implementation Pseudocode

```ts
export type WidgetEditorComponent<T> =
  | ComponentType<WidgetEditorProps<T>>
  | LazyExoticComponent<ComponentType<WidgetEditorProps<T>>>;

export type WidgetEditorBundle<T> = {
  wizard: WidgetEditorComponent<T>;
  visual: WidgetEditorComponent<T>;
  advanced: WidgetEditorComponent<T>;
};

export type WidgetDefinition<T = Record<string, unknown>> = {
  // Existing fields stay unchanged.
  editor: WidgetEditorBundle<T>;
  editorCapabilities?: WidgetEditorCapabilities;
  editorContract?: WidgetEditorContract;
};
```

```ts
function hasCompleteEditor(def: WidgetDefinition) {
  return Boolean(def.editor?.wizard && def.editor.visual && def.editor.advanced);
}

function validateWidgetEditorDefinition(def: WidgetDefinition) {
  if (hasCompleteEditor(def)) return;
  throw new Error("widget_editor_invalid");
}
```

Data flow:

- Runtime/core registration still registers widget schema, defaults, surfaces,
  variants, renderers, and metadata synchronously.
- Admin metadata consumers can list widgets without executing lazy editor module
  imports.
- Admin editor consumers render the existing `editor[mode]` component under
  `Suspense`.

Error handling:

- Incomplete editor bundles still throw `widget_editor_invalid`.
- Missing editor contracts still throw.
- Lazy component import failures are handled by the admin editor outlet/panel,
  not by registry-time validation.

Regression-test shape:

```ts
test("registerWidget accepts lazy editor components", () => {
  const def = makeWidgetDefinition({
    editor: makeLazyEditorBundle(),
  });

  expect(() => registerWidget(def)).not.toThrow();
});

test("registerWidget rejects widgets without complete editor modes", () => {
  const def = makeWidgetDefinition({ editor: { wizard: LazyWizard } });
  expect(() => registerWidget(def)).toThrow("widget_editor_invalid");
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** widget schemas/default normalizers remain the
  source of truth.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** contract changes must not cause server-only modules,
  provider keys, DB clients, or privileged settings to enter browser bundles.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- (admin `widgetsClient.test.ts` registry-boundary coverage is owned by TASK-467-03-L02)
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md` if contributor-facing widget editor contract wording
  changes.
- Parent task/changelog on TASK-467 closure.

## Acceptance Criteria

1. Widget definitions can use eager or `React.lazy` editor components.
2. Runtime/metadata registration stays synchronous and browser-safe.
3. Missing editor mode contracts still fail closed.
4. No admin editor barrel import is needed to register widget metadata.
