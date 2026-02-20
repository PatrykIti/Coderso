# TASK-054-13-06-02: Installer Extensions for Taxonomies, Forms, Menus, and SEO
# FileName: TASK-054-13-06-02_Installer_Extensions_Taxonomies_Forms_Menus_SEO.md

**Priority:** High  
**Category:** CMS/Install Engine  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-13-06-01, TASK-054-13-02  
**Status:** Done (2026-02-20)

---

## Overview
Rozszerzyć install engine, aby oprócz core rekordów instalował i rollbackował pack metadata: taxonomy terms, form fields, menu items i page SEO defaults.

## Scope
1. Content type operation:
   - schema override,
   - taxonomy config + terms sync.
2. Form operation:
   - rich form settings,
   - fields replace/upsert behavior.
3. Page operation:
   - starter block composition,
   - SEO defaults sync (seo_documents target=page).
4. Menu operation:
   - menu items sync,
   - pageSlug -> pageId resolution.
5. Rollback:
   - restore nested snapshots dla update,
   - remove linked SEO records for create/delete rollback path.

## Files
- `core/services/kits/solutionKitsInstallService.ts`
- `core/db/schema.ts` (if needed only for types/import usage; no migration expected)

## Pseudocode
```ts
// executeFormOperation
const fieldsBefore = await listFormFieldsTx(formId)
await replaceFormFieldsTx(formId, payload.fields)

// executePageOperation
await upsertSeoForPageTx(pageId, payload.seo)

// executeMenuOperation
const resolvedItems = await resolveMenuItems(pageIdBySlug)
await replaceMenuItemsTx(menuId, resolvedItems)
```

## Testing Requirements
- Unit/DB: update path stores nested before/after snapshots.
- Unit/DB: rollback restores nested records.
- Unit/DB: reinstall keeps idempotency (no duplicate terms/fields/items/seo docs).

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (installer nested resource strategy)
