# TASK-324: Shared Commerce Source Fields Widget Bounds and Copy Contract

# FileName: TASK-324_Shared_Commerce_Source_Fields_Widget_Bounds_and_Copy_Contract.md

**Priority:** High
**Category:** Shared Widgets + Commerce + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-07
**Status:** In Progress (2026-05-19)

---

## Overview

Create a shared `CommerceSourceFields` contract that can express widget-specific
editor bounds and helper copy without forcing Product Compare, Product Gallery,
or Product Table to fork the shared source controls locally.

This task was split out while auditing `TASK-279`, because the live shared owner
currently hardcodes the `Limit` control max to `48` and owns the default search,
collection fallback, and status helper copy for all commerce widgets.

Source report/task-driver coverage:

- `TASK-279-01 / BF-15`: Product Compare needs a truthful editor limit ceiling
  without changing Product Gallery/Product Table defaults.
- `TASK-279-07 / UX-07`: Product Compare needs widget-specific source guidance,
  but the live labels/placeholders/help copy are owned by
  `CommerceSourceFields`.
- `TASK-280-05`: Product Gallery already documents that shared
  `CommerceSourceFields` changes must be explicit and cross-widget tested.

## Scope Boundary

In scope:

- Add a backward-compatible shared source-field options contract for widget
  editor callers.
- Support widget-specific `limit` bounds in the shared editor path without
  changing the default `48` cap for existing commerce widgets that do not opt
  in.
- Support widget-specific placeholder/help/fallback copy through the shared
  owner instead of local wrappers.
- Add cross-widget regression coverage for shared commerce source-field changes.

Out of scope:

- Product Compare-specific query/runtime/schema changes; those stay in
  `TASK-279-01`.
- Product Compare-specific visual IA/layout work; that stays in `TASK-279-07`.
- New shared runtime/source query filters or public API payload changes.
- Local widget wrappers that duplicate `CommerceSourceFields` semantics instead
  of extending the shared owner.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` | Add backward-compatible per-widget options for limit bounds and helper copy in `normalizeSourceForEditor` and `CommerceSourceFields`. |
| `tests/vitest/ui/commerce-widget-editor-shared.test.tsx` | Cover default behavior preservation plus new per-widget bounds/copy options. |
| `tests/vitest/ui/product-compare-editor-wave.test.tsx` | Prove Product Compare uses the shared options rather than local source-field forks. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Add focused regression coverage if shared defaults or collection/status copy behavior is touched. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Add focused regression coverage if shared defaults or collection/status copy behavior is touched. |
| `_docs/_TASKS/TASK-279-01_Product_Compare_Source_Selection_and_Limit_Contract.md` | Point Product Compare source-limit work at this shared prerequisite. |
| `_docs/_TASKS/TASK-279-07_Product_Compare_Editor_IA_and_Source_Guidance.md` | Point Product Compare source-guidance work at this shared prerequisite. |
| `_docs/_TASKS/README.md` | Track this shared task status. |

## Implementation Pseudocode

```tsx
type CommerceSourceFieldCopy = {
  searchPlaceholder?: string;
  collectionFallbackLabel?: string;
  collectionHelpText?: string;
  statusHelpText?: string;
};

type CommerceSourceFieldOptions = {
  limitMax?: number;
  copy?: CommerceSourceFieldCopy;
};

export function normalizeSourceForEditor(
  source: CommerceWidgetSource | null | undefined,
  defaults: SourceDefaults,
  options: CommerceSourceFieldOptions = {}
) {
  const normalized = normalizeCommerceWidgetSource(source, defaults);
  const limitMax = options.limitMax ?? 48;
  return {
    ...normalized,
    limit: Math.min(limitMax, Math.max(1, normalized.limit)),
  };
}

export function CommerceSourceFields({
  source,
  onChange,
  options,
}: {
  source: NormalizedCommerceWidgetSource;
  onChange: (next: NormalizedCommerceWidgetSource) => void;
  options?: CommerceSourceFieldOptions;
}) {
  const limitMax = options?.limitMax ?? 48;
  const copy = options?.copy ?? {};

  return (
    <>
      <CommerceNumberField
        label="Limit"
        value={source.limit}
        min={1}
        max={limitMax}
        onChange={(next) => onChange({ ...source, limit: next })}
      />
      <CommerceTextField
        label="Search"
        placeholder={copy.searchPlaceholder ?? "title or slug"}
        value={source.search}
        onChange={(next) => onChange({ ...source, search: next })}
      />
      <CommerceTextField
        label={copy.collectionFallbackLabel ?? "Collection IDs fallback"}
        value={toCollectionCsv(source.collectionIds)}
        onChange={(next) => onChange({ ...source, collectionIds: fromCollectionCsv(next) })}
      />
      {copy.collectionHelpText ? <p>{copy.collectionHelpText}</p> : null}
      <p>{copy.statusHelpText ?? defaultStatusHelpText}</p>
    </>
  );
}
```

Data flow:

- Widget editor normalizes its local source through `normalizeSourceForEditor`
  with optional shared bounds/copy options.
- Shared `CommerceSourceFields` renders UI from the same shared options instead
  of hardcoding widget-specific values.
- Callers that do not pass options keep the existing `48` limit and current
  shared copy.

Error handling:

- Missing options preserve the current shared behavior exactly.
- Invalid `limitMax` falls back to the existing shared `48` cap.
- Shared copy options remain plain text only; no raw HTML, route URLs, or
  provider internals.
- If a requested widget-specific behavior cannot be expressed through this
  shared contract without affecting other widgets, stop and split another shared
  follow-up instead of introducing a local wrapper.

Regression-test shape:

```ts
test("normalizeSourceForEditor keeps shared defaults when no options are provided", () => {
  expect(normalizeSourceForEditor({ limit: 99 }, { limit: 6 })).toMatchObject({
    limit: 48,
  });
});

test("normalizeSourceForEditor clamps to widget-specific max when provided", () => {
  expect(
    normalizeSourceForEditor({ limit: 99 }, { limit: 3 }, { limitMax: 12 })
  ).toMatchObject({
    limit: 12,
  });
});
```

## Security Contract

This task does not add routes or public-write behavior.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: shared editor options stay code-owned and are not
  persisted directly in widget JSON unless a widget task explicitly adds schema
  fields for them.
- Anti-abuse: helper copy is plain text only; no provider secrets, raw query
  fragments, or scriptable content enters the editor contract.
- Secret handling: the shared source editor must not expose provider internals
  or privileged runtime payloads in labels/help copy.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/commerce-widget-editor-shared.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  when shared defaults or collection/filter guidance change.
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
  when shared defaults or collection/filter guidance change.
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/_TASKS/TASK-279-01_Product_Compare_Source_Selection_and_Limit_Contract.md`
- `_docs/_TASKS/TASK-279-07_Product_Compare_Editor_IA_and_Source_Guidance.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed

## Acceptance Criteria

- Shared commerce source controls support widget-specific limit bounds without
  changing the default `48` cap for callers that do not opt in.
- Shared commerce source controls support widget-specific placeholder/help copy
  without local widget wrappers.
- Product Compare source-limit and source-guidance work can depend on this task
  instead of forking `CommerceSourceFields`.
- Shared editor changes are covered in `commerce-widget-editor-shared` tests and
  the affected widget editor-wave regressions.
