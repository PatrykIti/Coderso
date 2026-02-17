# TASK-054-01: Coderso Information Architecture and Naming
# FileName: TASK-054-01_Coderso_Information_Architecture_and_Naming.md

**Priority:** High  
**Category:** UX + Product IA  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054  
**Status:** To Do

---

## Goal
Define a stable, user-friendly naming and IA contract for the `Coderso` section.

## Files to Change
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_NAVIGATION.md`
- `core/admin/config/adminNav.ts` (or current nav config file)

## Contract
- Root group: `Coderso`
- Modules (v1):
  - `Engine` (content model builder / content types)
  - `Entries` (content entries)
  - `Widgets`
  - `Forms`
  - `Posts` (dedicated editorial workflow in TASK-055)
- Labels remain explicit and non-technical in helper text.

## Pseudocode
```ts
const codersoNavGroup = {
  id: "coderso",
  label: "Coderso",
  icon: Blocks,
  children: [
    { id: "coderso-engine", label: "Engine", href: "/admin/coderso/engine" },
    { id: "coderso-entries", label: "Entries", href: "/admin/coderso/entries" },
    { id: "coderso-widgets", label: "Widgets", href: "/admin/coderso/widgets" },
    { id: "coderso-forms", label: "Forms", href: "/admin/coderso/forms" },
    { id: "coderso-posts", label: "Posts", href: "/admin/coderso/posts" },
  ],
};
```

## Acceptance Criteria
1. IA document lists purpose and boundaries for each module.
2. Naming avoids ambiguity for non-technical users.
3. Navigation config references the same canonical labels.
