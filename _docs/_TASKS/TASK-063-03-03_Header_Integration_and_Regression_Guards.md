# TASK-063-03-03: Header Integration and Regression Guards
# FileName: TASK-063-03-03_Header_Integration_and_Regression_Guards.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-03-02  
**Status:** Done (2026-02-24)

---

## Overview
Scalic nowe clustery w finalny header i dodac zabezpieczenia regresyjne.

---

## Scope
1. Dodac `PostEditorHeader` jako kompozycje tools + center + actions.
2. Usunac stale fragmenty starego topbara.
3. Dodac testy integration dla finalnego ukladu headera.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`

---

## Pseudocode
```ts
<PostEditorHeader tools=... center=... actions=... />
mount header inside layout.header region
```

---

## Acceptance Criteria
1. Header jest modularny i stabilny.
2. Stary topbar nie zostawia dead code.

---

## Testing Requirements
- Integration: header render + core actions.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
