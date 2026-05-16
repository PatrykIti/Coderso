# TASK-271-06: Grid Columns Gap Tokens and Density Controls

# FileName: TASK-271-06_Grid_Columns_Gap_Tokens_and_Density_Controls.md

**Priority:** Medium
**Category:** Widgets + Grid Columns + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-256-05-01, TASK-271-01
**Status:** To Do

---

## Overview

Expand Grid Columns spacing options with bounded gap tokens and clearer density
controls while preserving the current separate `gapX` and `gapY` data model.

This leaf owns report finding W10 and the implementation side of U1. The report
claims X/Y gaps are identical, but current code already stores and edits
`layout.gapX` and `layout.gapY` separately. This leaf must not duplicate a fix
that already exists.

## Scope

- Add missing bounded gap tokens such as `1`, `5`, `7`, `10`, and `12` if they
  match the design-token contract.
- Keep `none` as the explicit zero gap token and avoid introducing a second
  `0` synonym.
- Update labels to show readable density/scale copy.
- Add optional density presets only if they write the existing `gapX/gapY`
  fields instead of adding a redundant spacing model.

Out of scope:

- Shared `Clear`/`none` semantics; TASK-256-02 owns the global token contract.
- Arbitrary custom pixel inputs.
- Page-wide spacing token redesign.

## Sub-Tasks

- [ ] Expand approved bounded Grid Columns gap tokens.
- [ ] Keep `gapX` and `gapY` independent in schema, editor, and runtime output.
- [ ] Replace vague gap labels with readable scale labels.
- [ ] Add optional density presets only as writes to existing `gapX/gapY`.
- [ ] Add runtime, editor, validator, and token-adjacent tests.
- [ ] Update Grid Columns docs/report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/gridColumns.tsx` | Extend `gridColumnsGapTokens`, class maps, schema, and normalizer fallbacks. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Update labels and optional density preset controls. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover new gap tokens, default fallback, and class output. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover new labels and editor value changes. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Update if shared spacing-token expectations mention Grid Columns. |
| `tests/unit/widgets/validator.test.ts` | Cover schema acceptance/rejection for new tokens. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Document expanded gap tokens and the existing separate X/Y model. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Mark W10 and U1 fixed/current-state/deferred with evidence. |

## Implementation Pseudocode

Gap token expansion:

```ts
export const gridColumnsGapTokens = [
  "none",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "10",
  "12",
] as const;

const gapXClassMap: Record<GridColumnsGap, string> = {
  none: "gap-x-0",
  "1": "gap-x-1",
  "2": "gap-x-2",
  "3": "gap-x-3",
  "4": "gap-x-4",
  "5": "gap-x-5",
  "6": "gap-x-6",
  "7": "gap-x-7",
  "8": "gap-x-8",
  "10": "gap-x-10",
  "12": "gap-x-12",
};
```

Label helper:

```ts
const gapScaleLabels: Record<GridColumnsGap, string> = {
  none: "None - 0px",
  "1": "Gap 1 - 4px",
  "2": "Gap 2 - 8px",
  "3": "Gap 3 - 12px",
  "4": "Gap 4 - 16px",
  "5": "Gap 5 - 20px",
  "6": "Gap 6 - 24px",
  "7": "Gap 7 - 28px",
  "8": "Gap 8 - 32px",
  "10": "Gap 10 - 40px",
  "12": "Gap 12 - 48px",
};
```

Error handling:

- Unknown legacy gap values must normalize to existing fallback `6`.
- Tests must prove `gapX` and `gapY` remain independent.
- Density presets must not introduce hidden values outside
  `gridColumnsGapTokens`.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new gap tokens must be strict enum values.
- Anti-abuse: no arbitrary CSS values or class strings.
- Secret handling: no secrets in layout data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  updated.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/GRID_COLUMNS.md` with the expanded gap token list.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` with W10/U1 evidence
  and the current-state note that `gapX` and `gapY` are already separate.
- Update TASK-271-07 closure matrix.

## Acceptance Criteria

- Grid Columns supports the approved expanded gap token set.
- `gapX` and `gapY` remain independent in schema, editor, normalizer, and
  runtime classes.
- `none` remains the only zero-gap token.
- Editor labels explain the spacing scale without changing persisted values.
