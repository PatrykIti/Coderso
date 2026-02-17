# TASK-055: Posts Screen and Editor for Widget/Template Runtime
# FileName: TASK-055_Posts_Screen_and_Editor_for_Widget_Template_Runtime.md

**Priority:** High  
**Category:** CMS/Content + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054, TASK-053-07, TASK-053-08  
**Status:** To Do

---

## Overview
Add a dedicated `Posts` area (Wpisy) for editorial workflows, based on the proven `Pages` list/editor UX. Posts are created as articles and displayed on site pages through widgets and templates.

Implementation should avoid duplicate data models by reusing `content_types` + `content_entries` under a reserved content type (`post`).

## Goals
- Provide a WordPress-like `Posts` experience in admin.
- Reuse existing content model and validation architecture.
- Support rendering posts on frontend via widgets/templates.
- Keep responsive behavior and caching consistent with existing editors.

## Non-Goals
- Build a separate database table only for posts.
- Replace the generic Content/Content Types modules.
- Introduce a second incompatible editorial flow.

## Scope
1. Posts domain contract and API aliases.
2. Posts list table (Pages-like UX).
3. Post editor with metadata panels.
4. Widget/template binding for post queries.
5. Public runtime routes and rendering for post detail/list.
6. Tests and documentation.

---

## Sub-Tasks
- `TASK-055-01_Posts_Domain_Model_and_API_Contract.md`
- `TASK-055-02_Posts_List_Screen_WordPress_Like_Table.md`
- `TASK-055-03_Post_Editor_Workflow_and_Metadata_Panels.md`
- `TASK-055-04_Posts_Widget_Template_Binding_and_Query_Controls.md`
- `TASK-055-05_Posts_Public_Routes_and_Rendering.md`
- `TASK-055-06_Posts_Tests_Migrations_and_Documentation.md`

---

## Acceptance Criteria
1. Admin has a dedicated `Posts` list and editor screen.
2. Creating/updating/publishing posts reuses existing entry lifecycle safely.
3. Widgets/templates can query and render posts without custom hacks.
4. Public post list/detail routes are configurable and documented.
5. Unit/integration tests cover critical post flows.

---

## Testing Requirements
- Unit tests for posts service and route mapping.
- Integration tests for posts API aliases and publish flow.
- UI tests for list actions, quick navigation, autosave/history behavior.
- Runtime tests for post list/detail rendering and preview.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/CONTENT_MODELING.md`
- `_docs/_CHANGELOG/*.md` (when implemented)
