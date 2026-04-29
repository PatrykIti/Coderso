# TASK-054: Coderso Modular Admin IA
# FileName: TASK-054_Coderso_Modular_Admin_IA.md

**Priority:** High  
**Category:** Admin/UI + UX + Information Architecture  
**Estimated Effort:** Large  
**Dependencies:** TASK-053-08, TASK-053-07  
**Status:** Done (2026-04-29)

---

## Overview

Close the original Coderso modular admin IA umbrella. The delivered contract is
now `Advanced` as the admin module group, while `Coderso` remains the product
brand. Canonical routes use `/admin/advanced/*`; legacy `/admin/coderso/*`
routes remain compatibility aliases.

This task defines IA, naming, routing, responsive behavior, and backward compatibility so the UX stays user-friendly for non-technical users while preserving existing deep links.

The target is a WordPress-like, low-code experience similar in breadth to Crocoblock's JetPlugins stack, but implemented natively in Coderso architecture.

## Goals

- Add a single sidebar root node for advanced modules.
- Keep feature names explicit and friendly inside the group.
- Preserve existing URLs and shortcuts through redirects/aliases.
- Keep behavior consistent on desktop and mobile.
- Define a scalable module catalog so users can build complete business websites without custom code.

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
6. Module roadmap parity with major Crocoblock capabilities (data, listing, filters, booking, forms, commerce, engagement).
7. Preserve current Admin UI visual system and runtime theme controls for all Advanced module screens.

---

## Sub-Tasks

- `TASK-054-01_Coderso_Information_Architecture_and_Naming.md`
- `TASK-054-02_Coderso_Sidebar_Navigation_and_Permissions.md`
- `TASK-054-03_Coderso_Routes_and_Backward_Compatibility.md`
- `TASK-054-04_Coderso_Module_Shell_and_Responsive_Behavior.md`
- `TASK-054-05_Coderso_Docs_and_Regression_Tests.md`
- `TASK-054-06_Coderso_Module_Catalog_and_Tiers.md`
- `TASK-054-07_Coderso_Dynamic_Data_and_Listing_Suite.md`
- `TASK-054-08_Coderso_Filters_and_Search_Suite.md`
- `TASK-054-09_Coderso_Forms_and_Automation_Suite.md`
- `TASK-054-10_Coderso_Booking_and_Appointment_Suite.md`
- `TASK-054-11_Coderso_Commerce_Suite.md`
- `TASK-054-12_Coderso_Menu_Popup_Reviews_Engagement_Suite.md`
- `TASK-054-13_Coderso_Solution_Kits_and_AI_Wizard.md`
- `TASK-054-14_Coderso_Composite_First_Widget_Strategy.md`
- `TASK-054-15_Coderso_Plugin_Contract_and_Package_Manifest.md`
- `TASK-054-16_Coderso_Module_Widget_Pack_Matrix.md`
- `TASK-054-17_Coderso_Presets_Templates_and_Kits_Contract.md`
- `TASK-054-18_Coderso_AI_Assistant_Guided_Builder_Workflow.md`
- `TASK-054-19_Coderso_QA_Performance_and_Security_Gates.md`
- `TASK-054-20_Coderso_Membership_and_Client_Portal_Suite.md` (closed as superseded by `TASK-239`)
- `TASK-054-21_Coderso_Multilingual_and_i18n_Suite.md` (closed as superseded by `TASK-240`)
- `TASK-054-22_Coderso_Custom_Screens_From_Widgets.md`

---

## Acceptance Criteria

1. Sidebar shows `Advanced` as a group with expandable child modules.
2. Existing links to current modules still work (redirect/alias, no dead routes).
3. Mobile navigation and desktop behavior remain consistent.
4. Search/navigation labels are understandable for non-technical users.
5. Unit tests cover nav state, active item, redirects, and permission gates.
6. Module catalog and implementation order are defined for full-site builds (including service businesses such as automotive workshops).
7. Delivery model is defined as `Kits -> Composite widgets -> Atomic widgets (advanced)` with clear UX modes.
8. All Advanced module pages remain fully compatible with existing `Admin UI Themes` (tokens, templates, visual settings).
9. Every subtask includes unit tests for core logic and UI state transitions.

---

## Testing Requirements

- Unit tests for nav tree rendering and active-state matching.
- Unit tests for legacy route redirects.
- E2E smoke: open each Advanced module from sidebar on desktop and mobile widths.
- For each `TASK-054-XX` implementation: add detailed unit tests for service logic, validation rules, and critical UI states.

## Documentation Updates Required

- `_docs/ADMIN_NAVIGATION.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_CHANGELOG/*.md` (when implemented)

## Closure Notes

- 2026-04-29: Closed the historical umbrella after the IA/routing contract was
  delivered through the `Advanced` module group, canonical `/admin/advanced/*`
  paths, compatibility `/admin/coderso/*` aliases, Advanced module registry,
  route normalization, prefetch coverage, and navigation tests.
- 2026-04-29: `TASK-054-20` and `TASK-054-21` were intentionally closed as
  superseded planning stubs. Their product work continues as execution-ready
  umbrella tasks `TASK-239` and `TASK-240`, so they do not keep the original IA
  umbrella open.
- 2026-04-29: Updated architecture documentation wording from the historical
  `Coderso` group to the current `Advanced` module group.
