# TASK-054-16: Coderso Module Widget Pack Matrix
# FileName: TASK-054-16_Coderso_Module_Widget_Pack_Matrix.md

**Priority:** High  
**Category:** Product Design System + Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-06, TASK-054-14  
**Status:** Done (2026-02-20)

---

## Goal
Define minimum widget pack requirements per module to guarantee complete no-code assembly.

## Matrix Rules
Each module must ship:
- `1` page-level preset
- `2` section presets
- `3` composite widgets
- optional atomic widgets

## Files to Change
- `_docs/CODERSO_MODULES.md`
- `_docs/WIDGET_PACK_MATRIX.md` (new)
- `core/widgets/registry.ts`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`

## Example Matrix (v1)
- Engine/Entries:
  - Composite: `Entity cards`, `Entity detail`, `Entity highlights`
- Forms:
  - Composite: `Lead form with CTA`, `Request form`, `Service intake`
- Listings:
  - Composite: `Grid listing`, `Table listing`, `Map-ready listing`
- Booking:
  - Composite: `Service selector + calendar`, `Appointment intake`, `Confirmation panel`

## Pseudocode
```ts
function validateModulePack(moduleId: string, widgets: WidgetDefinition[]) {
  const composites = widgets.filter((w) => w.module === moduleId && w.complexity === "composite");
  if (composites.length < 3) {
    throw new Error(`module_pack_invalid:${moduleId}`);
  }
}
```

## Acceptance Criteria
1. Every enabled module passes minimum pack validation.
2. Library can filter by module and show recommended composites first.
3. Product roadmap includes missing pack gaps explicitly.

## Testing Requirements
- Unit: module pack validator.
- Unit: library grouping by module.
- Snapshot: recommended packs per module.

## Documentation Updates Required
- `_docs/WIDGET_PACK_MATRIX.md` (new)
- `_docs/CODERSO_MODULES.md`
- `_docs/_CHANGELOG/*.md` (when implemented)

## Sub-Tasks
- `TASK-054-16-01`: Matrix contract file and module pack definitions
- `TASK-054-16-02`: Registry-level pack validator and coverage report
- `TASK-054-16-03`: Widget library module UX integration (pack-aware ordering/labels)
- `TASK-054-16-04`: Tests, docs, changelog, and closure

## Completion Notes (2026-02-20)
- Added module pack matrix contract with strict/advisory enforcement profile.
- Added registry pack status/validation APIs and wired strict validation into widget catalog service.
- Updated widget library module filter to be pack-aware with readiness-first ordering.
- Added tests/docs/changelog and closed parent/subtasks.
