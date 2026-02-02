# TASK-050-02: Widget Template Revision History
# FileName: TASK-050-02_Widget_Template_Revision_History.md

**Priority:** Medium  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-049-02, TASK-049-03, TASK-049-06  
**Status:** To Do

---

## Overview

Store revisions of widget templates and allow restoring older versions from the
editor. Revisions must capture metadata (name, description, category, status)
plus blocks.

---

## UX Requirements

- "Revision History" button opens a right-side drawer.
- List items show timestamp, author (if available), status, and short summary.
- Restore action prompts confirmation and then loads that revision into the editor.
- Restoring creates a new revision (audit-safe).

---

## Data / API Requirements

- New table: `widget_template_revisions`.
- Fields: `id`, `template_id`, `name`, `description`, `category`, `status`, `blocks`, `created_at`, `created_by`.
- Revisions created on every save (create + update).
- API:
  - `GET /widget-templates/:id/revisions`
  - `POST /widget-templates/:id/revisions/:revisionId/restore`

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | add table | `widget_template_revisions` |
| `core/db/migrations/00xx_widget_template_revisions.sql` | add migration | create table + indexes |
| `core/services/widgets/widgetTemplateRevisionService.ts` | create | CRUD + restore |
| `core/services/widgets/widgetTemplateService.ts` | update | write revision on create/update |
| `core/server/routes/widgetTemplateRoutes.ts` | extend | revisions endpoints |
| `core/server/validation/widgetSchemas.ts` | add schema | restore payload if needed |
| `core/admin/services/widgetTemplateRevisionsClient.ts` | create | list + restore |
| `core/admin/ui/widgets/WidgetTemplateRevisionDrawer.tsx` | create | list + restore UI |
| `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx` | wire | open drawer + restore flow |
| `tests/unit/widgets/widgetTemplateRevisionService.test.ts` | add | DB-backed tests |
| `tests/unit/admin/widgetTemplateRevisionsClient.test.ts` | add | endpoint wiring |
| `tests/integration/routes/widgetTemplateRevisions.test.ts` | add | route registration |

---

## Testing Requirements

- Unit: revision creation on update + restore loads correct blocks.
- Unit: client calls correct endpoints.
- Integration: route registration + permission guards.

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (template revision behavior)
- `_docs/DATA_MODEL.md` (new revisions table)
- `_docs/AUDIT_SPEC.md` (audit events for restore, if added)
- `_docs/README.md` (index if new doc file is added)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-template-revisions.md`
