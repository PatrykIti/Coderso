# TASK-054: Coderso Modular Admin IA
# FileName: TASK-054_Coderso_Modular_Admin_IA.md

**Priority:** High  
**Category:** Admin/UI + UX + Information Architecture  
**Estimated Effort:** Large  
**Dependencies:** TASK-053-08, TASK-053-07  
**Status:** To Do

---

## Overview
Introduce `Coderso` as an umbrella section in admin sidebar, with expandable modules (`Engine`, `Entries`, `Widgets`, `Forms`, and future modules).

This task defines IA, naming, routing, responsive behavior, and backward compatibility so the UX stays user-friendly for non-technical users while preserving existing deep links.

## Goals
- Add a single sidebar root node: `Coderso`.
- Keep feature names explicit and friendly inside the group.
- Preserve existing URLs and shortcuts through redirects/aliases.
- Keep behavior consistent on desktop and mobile.

## Non-Goals
- Rebuild all module internals in this task.
- Change public runtime behavior.
- Remove existing permissions model.

## Scope
1. IA contract: naming, ordering, and role of each module.
2. Sidebar and route wiring.
3. Redirect compatibility for old paths and bookmarks.
4. Responsive behavior for expanded/collapsed navigation.
5. Documentation and regression test coverage.

---

## Sub-Tasks
- `TASK-054-01_Coderso_Information_Architecture_and_Naming.md`
- `TASK-054-02_Coderso_Sidebar_Navigation_and_Permissions.md`
- `TASK-054-03_Coderso_Routes_and_Backward_Compatibility.md`
- `TASK-054-04_Coderso_Module_Shell_and_Responsive_Behavior.md`
- `TASK-054-05_Coderso_Docs_and_Regression_Tests.md`

---

## Acceptance Criteria
1. Sidebar shows `Coderso` as a group with expandable child modules.
2. Existing links to current modules still work (redirect/alias, no dead routes).
3. Mobile navigation and desktop behavior remain consistent.
4. Search/navigation labels are understandable for non-technical users.
5. Unit tests cover nav state, active item, redirects, and permission gates.

---

## Testing Requirements
- Unit tests for nav tree rendering and active-state matching.
- Unit tests for legacy route redirects.
- E2E smoke: open each Coderso module from sidebar on desktop and mobile widths.

## Documentation Updates Required
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_CHANGELOG/*.md` (when implemented)
