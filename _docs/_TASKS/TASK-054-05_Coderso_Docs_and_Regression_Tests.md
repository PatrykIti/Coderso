# TASK-054-05: Coderso Docs and Regression Tests
# FileName: TASK-054-05_Coderso_Docs_and_Regression_Tests.md

**Priority:** Medium  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-01..04  
**Status:** To Do

---

## Goal
Lock down Coderso navigation behavior with tests and update documentation to avoid ambiguity.

## Files to Change
- `tests/unit/ui/admin-shell-nav.test.tsx`
- `tests/unit/ui/admin-router.test.tsx`
- `tests/unit/ui/admin-link.test.tsx`
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_CHANGELOG/*.md` (when implemented)

## Test Matrix
- Sidebar renders `Coderso` with expected child order.
- Permissions hide child items and optionally parent group.
- Alias routes map to canonical Coderso routes.
- Mobile drawer closes after selecting child route.

## Pseudocode
```ts
test("legacy /admin/content-types redirects to coderso engine", () => {
  const resolved = resolveAdminRoute("/admin/content-types");
  expect(resolved).toBe("/admin/coderso/engine");
});

test("Coderso group hidden when no child permission", () => {
  const tree = buildNavTree({ permissions: [] });
  expect(tree.find((i) => i.id === "coderso")).toBeUndefined();
});
```

## Acceptance Criteria
1. Test suite catches route alias or permission regressions.
2. Docs clearly describe Coderso as umbrella section.
3. Changelog template prepared for implementation merge.
