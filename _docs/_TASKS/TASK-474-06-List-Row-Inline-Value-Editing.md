# TASK-474-06: List Row Inline Value Editing
# FileName: TASK-474-06-List-Row-Inline-Value-Editing.md

**Parent Task:** TASK-474
**Priority:** Medium
**Category:** Custom Screens / List View / V4 Schema
**Estimated Effort:** Large
**Dependencies:** TASK-474-01, TASK-474-04; coordinates with TASK-473
**Status:** ⏳ To Do

---

## Overview

Enable editing a record value directly in a List View row (owner decision
2026-06-21: List View gets chrome parity **and** inline row editing). The flat V4
`CustomScreenListViewDefinition` has no block/binding model for rows, so this
subtask adds an **additive, backward-compatible** row-template document +
bindings, a normalizer + V1/V2/V3 migration that backfills a default row template
from the visible columns, a list-row binding resolver, and wires
`ListViewCanvas` cells to the neutral `InlineEditWrapper`. Field **values**
persist through the existing content-entry write path; any per-record
*presentation* override coordinates with TASK-473's storage (no duplicate
contract).

## Current State (summary)

- `core/services/customScreens/customScreenSchemas.ts`: `CustomScreenListViewDefinition`
  (`:80`) is a flat columns/filters/sort/bulk shape; the V4 envelope is
  `schemaVersion: 4` (`:159`); `rejectUnknownKeys` guards definitions (`:226`,
  `:377`, `:454`, `:485`).
- `ListViewCanvas.tsx` renders a static table; cells are read-only text.
- `core/services/customScreens/bindingResolver.ts` resolves block→field bindings
  for the editor/entry document (reusable shape for rows).
- `core/admin/ui/custom-screens/customScreenListModel.ts` owns list field options
  / column helpers.

## Sub-Tasks

- [ ] Add an optional `rowTemplate` (document + `ScreenFieldBinding[]`) to the V4
  list-view definition, schema-first with `rejectUnknownKeys`.
- [ ] Add a normalizer + V1/V2/V3→V4 migration that backfills a default
  `rowTemplate` from the visible columns when none is stored (non-destructive).
- [ ] Add a list-row binding resolver (reuse `bindingResolver` patterns).
- [ ] Wire writable `ListViewCanvas` cells to `InlineEditWrapper`, committing
  field values through the content-entry write path; fail-closed on read-only.
- [ ] Coordinate any presentation override persistence with TASK-473.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/customScreenSchemas.ts` | Additive `rowTemplate` type + normalizer + reject-unknown. |
| `core/services/customScreens/bindingResolver.ts` | List-row binding resolution helper. |
| `core/admin/ui/custom-screens/customScreenListModel.ts` | Default-row backfill from visible columns. |
| `core/admin/ui/custom-screens/ListViewCanvas.tsx` | Inline-editable writable cells via `InlineEditWrapper`. |
| `tests/vitest/admin/custom-screen-schemas.test.ts` | Migration round-trips + unknown-key rejection. |
| `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx` | Inline row-edit + fail-closed coverage. |

## Implementation Pseudocode

```ts
// customScreenSchemas.ts — additive, backward-compatible
type CustomScreenListRowTemplate = {
  document: ScreenDocumentV1;            // one-row layout
  bindings: ScreenFieldBinding[];        // cell -> field
};
// V4 envelope gains optional rowTemplate; older defs migrate by backfill.
function normalizeCustomScreenListViewDefinition(input) {
  rejectUnknownKeys(input, [...existingKeys, "rowTemplate"]);
  const rowTemplate = input.rowTemplate
    ? normalizeRowTemplate(input.rowTemplate)
    : buildDefaultRowTemplate(input.columns);   // backfill from visible columns
  return { ...normalizedExisting, rowTemplate };
}
```

```tsx
// ListViewCanvas.tsx — writable cell inline edit
const writable = isRowFieldWritable(rowTemplate.bindings, column.field);
<td>
  {writable
    ? <InlineEditWrapper value={String(cellValue ?? "")} editable
        onCommit={(next) => onCommitRowField(entry.id, column.field, next)} />
    : <span>{formatCell(cellValue, column.formatter)}</span>}
</td>
```

Data flow:

- Read: list canvas loads entries + the V4 `rowTemplate` bindings; cells map
  columns→fields.
- Write: inline cell commit calls `onCommitRowField`, which persists the field
  value through the existing content-entry update service (content data, not
  presentation).
- Presentation overrides (if any) defer to TASK-473's override service.

Error handling:

- Unknown keys / invalid `rowTemplate` reject with `custom_screen_definition_invalid`
  at the normalizer; legacy flat-column definitions migrate without error.
- Read-only/unbound cells render no `contentEditable` (fail-closed).
- Field-level validation surfaces on the cell.

Regression-test shape:

```ts
test("legacy flat list-view definition migrates with a backfilled rowTemplate", () => {
  const v3 = legacyFlatListViewDefinition();
  const v4 = normalizeCustomScreenDefinition(v3);
  expect(v4.listView.rowTemplate.bindings.length).toBe(v3.listView.columns.length);
  expect(() => normalizeCustomScreenDefinition({ ...v4, listView: { ...v4.listView, bogus: 1 } }))
    .toThrow(/custom_screen_definition_invalid/);
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen + content-entry
  routes — no new public path.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` to load; `content:write` to persist row field values;
  preserve publish/delete-specific permissions.
- **CSRF expectations:** required for row-value writes (existing entry route).
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** **mandatory** — `rowTemplate` and bindings go
  through `rejectUnknownKeys` + normalizers; additive fields only; never bypass
  content-entry schema validation.
- **Anti-abuse controls:** no public write path; if a public runtime later needs
  row writes, require nonce + HMAC per existing patterns.
- **Secret handling:** row templates/bindings must not store credentials, CSRF
  tokens, or protected field values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/custom-screen-schemas.test.ts`
- `bun run test:vitest -- tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/customScreenRoutes.test.ts` (when `DATABASE_URL` available)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md` (list-view `rowTemplate` contract).
- `_docs/CMS_SPEC.md` (list row editing UX).
- `_docs/DATA_MODEL.md` if the stored definition shape is documented there.

## Acceptance Criteria

1. The V4 list-view definition optionally carries a `rowTemplate` document +
   bindings; the normalizer round-trips and rejects unknown keys.
2. Legacy flat-column (V1/V2/V3) definitions migrate without error, backfilling a
   default `rowTemplate` from the visible columns.
3. List canvas rows allow inline edit of writable bound fields, persisting through
   the content-entry write path; read-only/unbound cells are not editable.
4. Presentation override persistence (if used) reuses TASK-473 storage with no
   duplicate contract; vitest, lint, and types are green.
