# TASK-054-22-01: Screen Definition Contract and Schema
# FileName: TASK-054-22-01_Screen_Definition_Contract_and_Schema.md

**Priority:** High  
**Category:** CMS/Content + Schema  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-07, TASK-054-14  
**Status:** Done (2026-03-04)

---

## Overview
Zdefiniowac model danych dla "Custom Screen": definicja ekranu, layout widgetow i mapowania pol.

## Scope
1. Tabela DB dla definicji ekranow (name, contentTypeId, blocks, bindings, status).
2. Normalizacja i walidacja payloadow definicji (versioned schema).
3. Serwis do CRUD definicji (create/update/list/delete).

## Files to Create / Change
- `core/db/schema.ts`
- `core/db/migrations/*`
- `core/services/customScreens/customScreenService.ts` (new)
- `core/services/customScreens/customScreenSchemas.ts` (new)

## Pseudocode
```ts
const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  contentTypeId: z.string().uuid(),
  blocks: z.array(blockSchema),
  bindings: z.record(bindingSchema),
  status: z.enum(["draft", "active"]),
});
```

## Acceptance Criteria
1. Definicja ekranu jest wersjonowana i walidowana.
2. CRUD serwisu zachowuje deterministiczne ID i timestamps.
3. Zmiany DB maja pelne artefakty migracji.

## Testing Requirements
- Unit: walidacja schemy i normalizacja payloadu.
- Unit: serwis CRUD (in-memory or mocked storage).

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`

## Completion Notes (2026-03-04)
- Added `custom_screens` table with migration + snapshot/journal updates.
- Implemented `customScreenSchemas` validation/normalization and CRUD service.
- Added unit tests for schema validation and CRUD flow.
- Updated architecture and CMS API documentation.
