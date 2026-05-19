# TASK-271-04: Grid Columns Per-Column Surface and Overflow

# FileName: TASK-271-04_Grid_Columns_Per_Column_Surface_and_Overflow.md

**Priority:** Medium
**Category:** Widgets + Grid Columns + Styling
**Estimated Effort:** Large
**Dependencies:** TASK-256-05-01, TASK-271-03
**Status:** To Do

---

## Overview

Add bounded per-column surface overrides so one Grid Columns column can be
highlighted without forcing the same background, border, radius, padding, and
overflow behavior on every column.

This leaf owns report findings W1 and W9. It must not re-open TASK-256 clear,
color-picker, or inactive cardize-control contracts.

## Scope

- Extend column data with optional style overrides for background, border color,
  border width, radius, padding, and overflow.
- Keep global `style.cardizeColumns` and the current `masonry-lite` forced
  cardized behavior as the surface switch unless TASK-256 first changes that
  contract. TASK-271 may add a per-column "surface on" override, but not a
  per-column "surface off" escape hatch.
- Preserve existing global style behavior for legacy payloads.
- Add Visual controls that make per-column overrides discoverable without
  overwhelming beginner mode.
- Add Advanced controls for exact tokens once Visual owns the user-facing path.

Out of scope:

- Raw custom CSS class strings.
- Arbitrary CSS property maps.
- Shared `Clear`/`none` token semantics already owned by TASK-256-02 and
  TASK-256-05-01.

## Sub-Tasks

- [ ] Add strict per-column surface override schema fields.
- [ ] Merge per-column overrides with global cardized defaults at runtime.
- [ ] Add Visual and Advanced controls that follow TASK-256 clear semantics.
- [ ] Add bounded per-column overflow behavior.
- [ ] Add runtime, editor, and validator tests for overrides and rejected fields.
- [ ] Update Grid Columns docs/report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/gridColumns.tsx` | Extend column type/schema/default normalization and merge column-level style overrides into runtime output. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Add per-column surface controls with clear behavior aligned to TASK-256. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover global fallback, per-column override output, clear behavior, and overflow class output. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover editor controls for per-column overrides and clearing. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Update if token/clear semantics touch shared style helpers. |
| `tests/unit/widgets/validator.test.ts` | Cover new schema fields and reject unknown style properties. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Document per-column style behavior. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Mark W1/W9 fixed/deferred with evidence. |

## Implementation Pseudocode

## Value Contract

Column-level color values are public render data and must stay strictly bounded.
Use a schema/normalizer-owned `GridColumnsColorValue` that allows only:

- approved design-token variables matching `var(--color-<token>)`;
- hex colors matching `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`;
- omitted values, which mean "inherit the global Grid Columns value".

Reject raw class names, arbitrary CSS property maps, `url(...)`, `expression(...)`,
semicolon-separated declarations, angle brackets, script-like fragments, objects,
arrays, and unapproved CSS functions before data is persisted or rendered.

Column style shape:

```ts
type GridColumnsColorValue = string & { readonly __gridColumnsColorValue: unique symbol };

function normalizeGridColumnsColorValue(value: unknown): GridColumnsColorValue | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed as GridColumnsColorValue;
  }
  if (/^var\(--color-[a-z0-9-]+\)$/.test(trimmed)) return trimmed as GridColumnsColorValue;
  return undefined;
}

type GridColumnsColumnStyle = {
  surface?: "inherit" | "on";
  background?: GridColumnsColorValue;
  borderColor?: GridColumnsColorValue;
  borderWidth?: GridColumnsBorderWidth;
  radius?: GridColumnsRadius;
  padding?: GridColumnsPadding;
  overflow?: "visible" | "hidden";
};

type GridColumnsColumn = {
  id?: string;
  label?: string;
  desktopSpan?: GridColumnsSpan;
  tabletSpan?: GridColumnsSpan;
  mobileSpan?: GridColumnsSpan;
  style?: GridColumnsColumnStyle;
};
```

Runtime merge:

```ts
function resolveColumnSurface(
  global: StyleData,
  column: ResolvedGridColumn,
  resolvedVariant: GridColumnsVariantId
) {
  const override = column.style ?? {};
  const forcedCardized = resolvedVariant === "masonry-lite";
  const cardized = forcedCardized || override.surface === "on" || Boolean(global.cardizeColumns);
  return {
    cardized,
    backgroundColor: resolveClearableStyleValue(override.background ?? global.columnBackground),
    borderColor: resolveClearableStyleValue(override.borderColor ?? global.columnBorderColor),
    borderWidth: override.borderWidth ?? global.columnBorderWidth ?? "1",
    radius: override.radius ?? global.columnRadius ?? "xl",
    padding: override.padding ?? global.columnPadding ?? "4",
    overflow: override.overflow ?? "visible",
  };
}
```

Error handling:

- Column style overrides must be optional and non-destructive for legacy payloads.
- Clear actions remove the override field and fall back to the global value.
- If a per-column surface toggle is added before TASK-256 changes U6, it can only
  turn a column surface on. It must not disable global cardize or the current
  `masonry-lite` forced-cardized output.
- Color fields must preserve valid design-token variables after TASK-256 picker
  work and reject unsafe strings through schema/normalizer tests.
- Preserve the current `masonry-lite` forced-cardized behavior unless TASK-256
  intentionally replaces that contract first.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new style fields must be strict and covered by
  validator tests.
- Anti-abuse: no arbitrary style maps, raw class names, raw HTML, or scripts.
- Secret handling: style fields are public render data and must not contain
  secrets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  shared style behavior changes.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/GRID_COLUMNS.md` with per-column surface overrides.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` for W1/W9.
- Update TASK-271-07 closure matrix.

## Acceptance Criteria

- A single column can have a distinct surface style without changing every
  other column.
- Global cardized styling remains backward compatible.
- Clear removes only the override and returns to the global/default value.
- Overflow behavior is bounded to approved tokens and covered by runtime tests.
- Validator tests reject invalid color strings, raw classes, CSS functions with
  URLs, script-like fragments, and invalid hex lengths such as `#12345`.
- A regression test proves `masonry-lite` still renders cardized surfaces when
  column-level surface overrides are present.
