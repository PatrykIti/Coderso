# TASK-054-13-06-01: Solution Kit Pack Schema and Catalog Enrichment
# FileName: TASK-054-13-06-01_Solution_Kit_Pack_Schema_and_Catalog_Enrichment.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-05  
**Status:** To Do

---

## Overview
Rozszerzyć katalog kitów o pełne content packs: schema content types, taxonomy/terms, pages z widget composition, forms z fieldsetem i menu defaults.

## Scope
1. Rozszerzyć `SolutionKitResourceBlueprint` o richer payload (optional fields, bez breaking changes).
2. Uzupełnić wszystkie 5 kitów o komplet starter packów.
3. Dodać helpery katalogowe dla pack-level normalizacji i deduplikacji.

## Files
- `core/services/kits/solutionKitTypes.ts`
- `core/services/kits/solutionKitsCatalog.ts`

## Pseudocode
```ts
type SolutionKitPageBlueprint = {
  slug: string;
  title: string;
  status: "draft" | "published";
  template?: string;
  data?: Record<string, unknown>;
  seo?: { title?: string; description?: string; robots?: string; canonicalUrl?: string };
}

type SolutionKitFormBlueprint = {
  slug: string;
  name: string;
  status: "draft" | "published";
  fields?: FormFieldInput[];
}
```

## Testing Requirements
- Unit: każdy kit ma minimalny working set (>=1 page/form/content type/menu).
- Unit: blueprint IDs/keys są unikalne i deterministiczne.

## Documentation Updates Required
- `_docs/SOLUTION_KITS.md` (sekcja pack schema)
