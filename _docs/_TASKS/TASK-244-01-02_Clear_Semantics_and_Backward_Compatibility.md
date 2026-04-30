# TASK-244-01-02: Clear Semantics and Backward Compatibility

# FileName: TASK-244-01-02_Clear_Semantics_and_Backward_Compatibility.md

**Priority:** High
**Category:** Widgets + Compatibility
**Estimated Effort:** Small
**Dependencies:** TASK-244-01
**Status:** To Do

---

## Overview

Define the implementation contract for `Clear` before any widget renderer or
editor is changed.

`Clear` is a user action, not a saved token. It removes a configured visual
style. It must not be implemented by saving `"transparent"` into widget data only
to suppress a background.

## Sub-Tasks

- None. This is an execution leaf.

## Semantics

| UI concept | Saved representation | Runtime output |
|---|---|---|
| `None` token | serialized token such as `"none"` | token map output such as empty class, zero spacing, or no width constraint |
| `Clear` color/background | property omitted from the owning object | no inline style and no forced background/gradient/overlay class |
| deliberate `transparent` value | `"transparent"` string typed or picked by user | inline transparent style, because the user explicitly chose that color |
| legacy absent field | depends on audited widget data shape | must preserve existing visible behavior through explicit default data or legacy adapter |

## Required Helper Shape

Prefer local helpers first. Extract a shared helper only when multiple widgets
need the exact same behavior and the owner module stays Bun-free.

```ts
function resolveClearableStyleValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
}

function compactStyle(style: React.CSSProperties): React.CSSProperties | undefined {
  const next = Object.fromEntries(
    Object.entries(style).filter(([, value]) => value !== undefined)
  ) as React.CSSProperties;
  return Object.keys(next).length > 0 ? next : undefined;
}
```

Do not use a helper that converts cleared fields to `"transparent"`.

## Editor Payload Shape

Editor helpers must be able to remove keys. Existing `updateStyle` helpers that
only merge patches are not enough when the patch contains `undefined`.

```ts
function removeStyleKey<T extends { style?: Record<string, unknown> }>(
  value: T,
  key: string
): T {
  const { [key]: _removed, ...style } = value.style ?? {};
  return {
    ...value,
    style: Object.keys(style).length > 0 ? style : undefined,
  };
}
```

For nested groups such as Hero background:

```ts
function removeBackgroundKey(
  value: HeroData,
  key: keyof NonNullable<HeroData["background"]>
): HeroData {
  const { [key]: _removed, ...background } = value.background ?? {};
  return {
    ...value,
    background: Object.keys(background).length > 0 ? background : undefined,
  };
}
```

## Backward Compatibility Rules

1. Audit whether current inserted widgets persist style defaults or rely on
   runtime normalizer fallbacks.
2. If current saved data includes explicit defaults, cleared/missing fields can
   safely mean "no style" for future saves.
3. If legacy saved data omits defaults and runtime fallbacks create the visible
   style, add a narrow compatibility adapter instead of using transparent as an
   off marker.
4. Do not change structural variants just to avoid adding a clearable style
   contract.
5. Do not remove semantic state colors for warnings, errors, stock states,
   validation, or lifecycle badges.

## Testing Requirements

- Unit/render tests for helper behavior if a shared helper is introduced.
- Runtime tests proving cleared data omits style output.
- Backward-compatibility tests for representative default/legacy data where a
  fallback is changed.
- Editor tests proving `Clear` removes the key from emitted data.
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. The implementation has a clear absence-vs-transparent policy.
2. No clear action saves `"transparent"` as an implementation sentinel.
3. Legacy/default widget data behavior is tested where fallback semantics
   change.
4. Editor helpers can remove keys rather than only merge values.
