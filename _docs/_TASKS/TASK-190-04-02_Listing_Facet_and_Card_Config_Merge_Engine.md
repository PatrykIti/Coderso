# TASK-190-04-02: Listing Facet and Card Config Merge Engine
# FileName: TASK-190-04-02_Listing_Facet_and_Card_Config_Merge_Engine.md

**Priority:** High
**Category:** Assistant/Core + Listings + Filters
**Estimated Effort:** Large
**Dependencies:** TASK-190-04-01
**Status:** Done (2026-05-07)

---

## Overview

Merge listing facets and card config so composed catalogs can expose all
relevant filters and card fields.

Delivered slice note:
- Added `blueprintFacetMerger.ts` and `blueprintCardConfigMerger.ts` as the
  owners for composed listing facet/card merge.
- Compatible facet arrays and listing template card bindings now merge
  deterministically with source-path validation against the composed content
  schema.
- The assembler now widens `listing-query.upsert.fields` automatically so
  merged filter metrics and card bindings still have the projected runtime data
  they need.
- Missing facet/card source fields now fail closed through typed
  `facet_field_missing` needs-input behavior instead of silently producing a
  broken listing surface.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintFacetMerger.ts`
- Add `core/services/assistant/blueprints/blueprintCardConfigMerger.ts`
- Add `tests/vitest/assistant/blueprint-facet-card-merger.test.ts`
- Reuse `core/services/search/filterContract.ts`

## Pseudocode

```ts
export const mergeListingFacets = (schema, facets) => {
  const normalized = normalizeListingFacetConfigs(facets);
  return normalized.filter((facet) => {
    if (facet.kind === "sort") return true;
    return schemaHasField(schema, facet.field);
  });
};

export const mergeCardConfig = (schema, cardFields) => ({
  fields: orderCardFields(cardFields).filter((field) => schemaHasField(schema, field.source)),
  itemActions: mergeItemActions(cardFields),
  emptyState: mergeEmptyState(cardFields),
  style: mergeCardStyle(cardFields),
});
```

## Security Contract

- Visibility: internal planning.
- Auth model: unchanged.
- RBAC: listing writes still require listing action permissions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: facets pass `normalizeListingFacetConfigs`.
- Anti-abuse: no arbitrary filter paths outside merged schema.
- Secret handling: facets cannot target secret-like fields.

## Testing Requirements

- Range facet merge.
- Checkbox facet merge.
- Sort facet merge.
- Missing field facet rejection.
- Card field ordering and dedupe.

## Documentation Updates Required

- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
