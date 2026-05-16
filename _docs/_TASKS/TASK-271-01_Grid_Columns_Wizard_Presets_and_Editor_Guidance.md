# TASK-271-01: Grid Columns Wizard, Presets, and Editor Guidance

# FileName: TASK-271-01_Grid_Columns_Wizard_Presets_and_Editor_Guidance.md

**Priority:** High
**Category:** Widgets + Grid Columns + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-252, TASK-256-05-01, TASK-271
**Status:** To Do

---

## Overview

Expand the Grid Columns editor entry path so beginner users can configure all
columns without switching modes and apply common layout presets without editing
raw spans.

This leaf owns report findings C3, U2, U5, and U8 after TASK-256 has fixed the
shared slot/config and span-validation contracts. TASK-271-06 owns U1 gap-label
copy alongside gap-token expansion.

## Scope

- Generate Wizard label inputs for every configured column, not only columns 1
  and 2.
- Rename misleading `Column configs` copy to user-facing column-count wording.
- Add visual miniatures to the Visual variant cards for `equal`, `asymmetric`,
  and `masonry-lite`.
- Add predefined layout templates that update `columns[].desktopSpan`,
  `columns[].tabletSpan`, and `columns[].mobileSpan` through the existing
  normalizer.

Out of scope:

- Slot/config auto-sync, asymmetric span truthfulness, and span-sum validation;
  TASK-256-05-01 owns those shared contract repairs.
- New custom CSS class fields; TASK-271-07 must reject or defer that report item
  unless a future safe-class policy exists.

## Sub-Tasks

- [ ] Add dynamic Wizard label inputs for every configured Grid Columns column.
- [ ] Rename column-count copy and keep TASK-256 slot-sync guidance accurate.
- [ ] Add compact variant miniatures to the Visual variant cards.
- [ ] Add bounded layout preset application through the existing data model.
- [ ] Update focused editor tests and Grid Columns docs/report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Add dynamic Wizard labels, clearer column-count copy, variant miniatures, and preset buttons/selectors. |
| `core/widgets/core/gridColumns.tsx` | Add bounded preset metadata only if the editor needs a schema-owned helper; do not persist preset names unless required. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover dynamic Wizard labels, copy, gap labels, variant miniatures, and preset application. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover any new exported preset helper or normalizer behavior if added. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Document Wizard all-column editing and layout presets after implementation. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Mark C3/U1/U2/U5/U8 fixed or deferred with textual evidence. |

## Implementation Pseudocode

Wizard labels:

```tsx
function ColumnLabelInputs({ value, onChange }: GridColumnsEditorStateProps) {
  const normalized = normalizeGridColumnsData(value);
  return (normalized.columns ?? []).map((column, index) => (
    <Input
      key={column.id ?? index}
      value={column.label ?? ""}
      onChange={(event) => updateColumn(value, onChange, index, { label: event.target.value })}
      placeholder={`Column ${index + 1}`}
    />
  ));
}
```

Preset application:

```ts
type GridColumnsPreset = {
  id: "two-equal" | "one-third-two-thirds" | "two-thirds-one-third" | "three-equal" | "quarter-half-quarter";
  label: string;
  columns: Array<{ desktopSpan: GridColumnsSpan; tabletSpan: GridColumnsSpan; mobileSpan: GridColumnsSpan }>;
};

function applyGridColumnsPreset(data: GridColumnsData, preset: GridColumnsPreset): GridColumnsData {
  const current = normalizeGridColumnsData(data);
  return normalizeGridColumnsData({
    ...current,
    columns: preset.columns.map((shape, index) => ({
      ...(current.columns?.[index] ?? {}),
      id: current.columns?.[index]?.id ?? String(index + 1),
      label: current.columns?.[index]?.label ?? `Column ${index + 1}`,
      ...shape,
    })),
  });
}
```

Error handling:

- Presets must clamp to `gridColumnsColumnMin` and `gridColumnsColumnMax`.
- Presets must not delete existing labels where the same column index remains.
- If TASK-256 exposes a slot-target sync helper, call that helper before applying
  a preset so preset count and slot count stay aligned.
- Do not change gap labels here; TASK-271-06 owns U1 together with token
  expansion.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve the existing Grid Columns schema; if
  presets become persisted fields, add schema and validator tests.
- Anti-abuse: no raw HTML, scripts, or arbitrary classes in preset metadata.
- Secret handling: no secrets in editor diagnostics or widget data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx` if helpers
  move into `gridColumns.tsx`.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/GRID_COLUMNS.md` with Wizard all-column labels and
  layout preset behavior.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` with fixed/deferred
  evidence for C3, U2, U5, and U8.
- Update TASK-271-07 closure matrix when this leaf lands.

## Acceptance Criteria

- Wizard exposes label inputs for all configured columns from 2 through 6.
- Column-count copy no longer implies a second hidden configuration model.
- Variant cards include compact visual miniatures without relying on copied
  third-party assets.
- Layout presets apply bounded span data through the Grid Columns normalizer and
  preserve existing labels where possible.
