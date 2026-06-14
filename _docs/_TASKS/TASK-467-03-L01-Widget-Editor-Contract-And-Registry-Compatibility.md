# TASK-467-03-L01: Lazy Editor Component Contract And Registry Compatibility
# FileName: TASK-467-03-L01-Widget-Editor-Contract-And-Registry-Compatibility.md

**Parent Subtask:** TASK-467-03
**Priority:** High
**Category:** Widgets / Contracts / Bundle Performance
**Estimated Effort:** Medium
**Dependencies:** TASK-467-03
**Status:** ⏳ To Do

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
- [ ] Keep `WidgetDefinition<T>.editor` required with `wizard`, `visual`, and
  `advanced` component slots.
- [ ] Keep `registerWidget` validation fail-closed for missing editor modes.
- [ ] Update core widget registration typing only where needed so lazy
  components satisfy the existing editor object.
- [ ] Avoid adding an optional `loadEditor` contract unless implementation
  proves `React.lazy` cannot meet the bundle split safely.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/types.ts` | Widen editor component typing for `React.lazy` if current `ComponentType` is too narrow. |
| `core/widgets/registry.ts` | Keep required editor-mode validation intact. Update only if the lazy component type requires a narrower validation helper. |
| `core/widgets/core/index.ts` | Widen local `EditorBundle<T>` typing if needed; keep the `CoreWidgetEditors` object shape intact. |
| `tests/vitest/admin/widgetsClient.test.ts` | Cover eager and lazy editor registration compatibility. |

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

- `bun run test:vitest -- tests/vitest/admin/widgetsClient.test.ts`
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
