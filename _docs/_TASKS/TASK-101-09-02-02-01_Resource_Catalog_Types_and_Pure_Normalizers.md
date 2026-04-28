# TASK-101-09-02-02-01: Resource Catalog Types and Pure Normalizers
# FileName: TASK-101-09-02-02-01_Resource_Catalog_Types_and_Pure_Normalizers.md

**Priority:** High
**Category:** Core/Assistant
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-02-02
**Status:** Done (2026-04-11)

---

## Overview

Zdefiniowac czysty, Bun-free kontrakt katalogu resource/schema/widget context dla `LLM Guide` i normalizatory, ktore z surowych rekordow robia bounded, redacted, deterministic snapshot.

Ten leaf nie moze importowac DB, runtime widget adapterow, settings services ani route/server modules.

## Files to Change

- `core/services/assistant/adminContextTypes.ts` (new/update)
- `core/services/assistant/adminContextCatalogNormalizer.ts` (new)
- `core/services/assistant/actionPlanTypes.ts` (update only for exported context types if needed)
- `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts` (new)

## Target Contract

```ts
type AssistantResourceCatalogSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  budget: {
    maxItemsPerGroup: number;
    maxFieldsPerResource: number;
    truncated: boolean;
  };
  contentTypes: AssistantContentTypeSummary[];
  customScreens: AssistantCustomScreenSummary[];
  listings: {
    queries: AssistantListingQuerySummary[];
    templates: AssistantListingTemplateSummary[];
  };
  forms: AssistantFormSummary[];
  widgets: AssistantWidgetSummary[];
  warnings: string[];
};
```

## Pseudocode

```ts
export function normalizeAssistantResourceCatalog(raw, options) {
  const budget = normalizeBudget(options);
  const redacted = redactSecretLikeKeys(raw);
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    budget,
    contentTypes: clamp(sort(raw.contentTypes.map(normalizeContentType)), budget),
    customScreens: clamp(sort(raw.customScreens.map(normalizeCustomScreen)), budget),
    listings: normalizeListings(raw, budget),
    forms: clamp(sort(raw.forms.map(normalizeForm)), budget),
    widgets: clamp(sort(raw.widgets.map(normalizeWidget)), budget),
    warnings: collectWarnings(redacted),
  };
}
```

## Sub-Tasks

1. Add snapshot/summary types with `schemaVersion: 1`.
2. Add normalizers for content types, custom screens, listing queries/templates, forms, widgets, and widget templates.
3. Add deterministic sorting by stable key per group.
4. Add budget clamps and `truncated` metadata.
5. Add redaction for secret-like keys and ensure values/submissions are not modeled.

## Testing Requirements

- `bunx vitest run tests/vitest/assistant/admin-context-catalog-normalizer.test.ts --config vitest.config.ts`
- Cover content type field metadata, form field metadata, listing query/template summaries, widget summary, redaction, deterministic ordering, and budget truncation.

## Documentation Updates Required

- Covered by parent TASK-101-09-02-02 closure docs.

## Completion Notes (2026-04-11)

- Added `adminContextTypes.ts` and `adminContextCatalogNormalizer.ts`.
- Covered deterministic sorting, clamping, redaction, content type/form/listing/widget summaries, and omission of React editor/render implementation details.

## Validation (2026-04-11)

- `bunx vitest run tests/vitest/assistant/admin-context-catalog-normalizer.test.ts --config vitest.config.ts`
